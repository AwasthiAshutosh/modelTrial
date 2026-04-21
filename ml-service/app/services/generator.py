import torch
import numpy as np
import os
import cv2
from PIL import Image
from diffusers import StableDiffusionControlNetPipeline, ControlNetModel, UniPCMultistepScheduler

from .prompter import PromptEngine


class ImageGenerator:
    """
    Wraps the Stable Diffusion v1.5 + ControlNet (Canny) pipeline.

    How it works:
    1. The input room image is converted to a Canny edge map — this preserves
       the room's spatial layout (walls, furniture placement, proportions).
    2. The edge map acts as a 'conditioning image' for ControlNet.
    3. SD 1.5 generates a completely new image guided by both the prompt
       AND the structural edges — so the new design stays in the same layout.

    Hardware:
    - GPU (CUDA):  Uses float16 for ~2x speed + xformers memory efficiency.
    - CPU:         Uses float32. Generation will be VERY slow (~10-20 min per image).
    """

    CONTROLNET_ID = "lllyasviel/sd-controlnet-canny"
    DIFFUSION_ID = "runwayml/stable-diffusion-v1-5"

    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32
        self.active_loras = set()

        print(f"[ImageGenerator] Using device: {self.device} | dtype: {self.dtype}")

        if self.device == "cpu":
            print("[ImageGenerator] Running in CPU Fallback mode. Generation will be SLOW (~2-5 minutes).")
            try:
                # Load ControlNet
                self.controlnet = ControlNetModel.from_pretrained(
                    self.CONTROLNET_ID,
                    torch_dtype=self.dtype,
                )
                # Load Pipeline
                self.pipe = StableDiffusionControlNetPipeline.from_pretrained(
                    self.DIFFUSION_ID,
                    controlnet=self.controlnet,
                    torch_dtype=self.dtype,
                    safety_checker=None,
                )
                # Optimization for CPU
                self.pipe.scheduler = UniPCMultistepScheduler.from_config(self.pipe.scheduler.config)
                
                # Crucial CPU optimizations to prevent OOM
                self.pipe.enable_attention_slicing()
                
                print("[ImageGenerator] CPU Pipeline loaded successfully.")
            except Exception as e:
                print(f"[ImageGenerator] CPU loading failed: {str(e)}")
                self.controlnet = None
                self.pipe = None
        else:
            try:
                # Load ControlNet conditioner
                self.controlnet = ControlNetModel.from_pretrained(
                    self.CONTROLNET_ID,
                    torch_dtype=self.dtype,
                )

                # Load the full SD pipeline with ControlNet
                self.pipe = StableDiffusionControlNetPipeline.from_pretrained(
                    self.DIFFUSION_ID,
                    controlnet=self.controlnet,
                    torch_dtype=self.dtype,
                    safety_checker=None,
                )

                # UniPC is faster than DDIM/PNDM with similar quality
                self.pipe.scheduler = UniPCMultistepScheduler.from_config(
                    self.pipe.scheduler.config
                )
                self.pipe.enable_vae_slicing()
                # Use model-level CPU offload for faster GPU inference if available
                # but for pure CPU mode we use the block above.
                
            except Exception as e:
                print(f"[ImageGenerator] Memory error during initialization: {str(e)}")
                self.controlnet = None
                self.pipe = None

    def _extract_canny_edges(self, image: Image.Image) -> Image.Image:
        """
        Converts a PIL Image to a 3-channel Canny edge map.
        This is the structural conditioning signal sent to ControlNet.
        """
        image_np = np.array(image)
        v = np.median(image_np)
        lower = int(max(0, (1.0 - 0.33) * v))
        upper = int(min(255, (1.0 + 0.33) * v))
        edges = cv2.Canny(image_np, lower, upper)
        # ControlNet expects a 3-channel image
        edges_3ch = np.stack([edges, edges, edges], axis=2)
        return Image.fromarray(edges_3ch)

    def generate(
        self,
        image: Image.Image,
        prompt: str,
        style: str,
        num_inference_steps: int = 25,
        guidance_scale: float = 7.5,
    ) -> Image.Image:
        """
        Generates a redesigned room image.

        Args:
            image:                The original room PIL image.
            prompt:               Positive text prompt from PromptEngine.
            num_inference_steps:  Higher = better quality but slower.
            guidance_scale:       How tightly the output follows the prompt (7-9 typical).

        Returns:
            Generated PIL Image.
        """
        canny_condition = self._extract_canny_edges(image)

        if self.pipe is None:
            # Do not return mock_img. Raise an exception so Celery marks the task as failed.
            raise RuntimeError("GPU Generation failed or is unavailable. Please try again later.")

        # Dynamically load the style LoRA to save VRAM
        lora_path = os.path.join(os.path.dirname(__file__), "..", "models", "lora", style)
        if os.path.exists(lora_path):
            if style not in self.active_loras:
                self.pipe.load_lora_weights(lora_path, adapter_name=style)
                self.active_loras.add(style)
                print(f"[ImageGenerator] Dynamically loaded LoRA adapter: {style}")
            self.pipe.set_adapters([style])
        else:
            # Only disable LoRA if adapters were previously loaded.
            # Calling disable_lora() with zero adapters throws ValueError.
            if self.active_loras:
                self.pipe.set_adapters([])
            print(f"[ImageGenerator] No LoRA found for {style}, running base model.")

        output = self.pipe(
            prompt=prompt,
            image=canny_condition,
            negative_prompt=PromptEngine.NEGATIVE_PROMPT,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
        ).images[0]

        return output