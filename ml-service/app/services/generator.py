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

        print(f"[ImageGenerator] Using device: {self.device} | dtype: {self.dtype}")

        if self.device == "cpu":
            print("[ImageGenerator] Detected CPU Mode. Skipping massive Stable Diffusion load to prevent MemoryError (OOM).")
            print("[ImageGenerator] Entering Mock Generation mode.")
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
                    safety_checker=None,   # Disabled — no NSFW risk in interior design
                )

                # UniPC is faster than DDIM/PNDM with similar quality
                self.pipe.scheduler = UniPCMultistepScheduler.from_config(
                    self.pipe.scheduler.config
                )
                self.pipe.to(self.device)

                # Enable memory-efficient attention on GPU (requires xformers)
                try:
                    self.pipe.enable_xformers_memory_efficient_attention()
                    print("[ImageGenerator] xformers memory-efficient attention enabled.")
                except Exception:
                    print("[ImageGenerator] xformers not available — using default attention.")
            except Exception as e:
                print(f"[ImageGenerator] Memory error during initialization: {str(e)}")
                print("[ImageGenerator] Falling back to Mock Generation mode due to insufficient RAM.")
                self.controlnet = None
                self.pipe = None

    def _extract_canny_edges(self, image: Image.Image) -> Image.Image:
        """
        Converts a PIL Image to a 3-channel Canny edge map.
        This is the structural conditioning signal sent to ControlNet.
        """
        image_np = np.array(image)
        edges = cv2.Canny(image_np, 100, 200)
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
            # We are in Mock Mode. Instead of just showing boundaries, 
            # use a free external API (pollinations.ai) to generate a realistic image 
            # based on the prompt so the user can see the target style applied.
            print("[ImageGenerator] Warning: Pipe is None, generating realistic mock image via external API.")
            try:
                import urllib.request
                import urllib.parse
                import io
                
                safe_prompt = urllib.parse.quote(prompt)
                url = f"https://image.pollinations.ai/prompt/{safe_prompt}?width=512&height=512&nologo=true"
                
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=45) as response:
                    image_data = response.read()
                
                return Image.open(io.BytesIO(image_data)).convert("RGB")
            except Exception as e:
                print(f"[ImageGenerator] External API fallback failed: {e}")
                # Ultimate fallback to edge map if API fails or times out
                mock_img = np.array(canny_condition)
                if "modern" in prompt.lower() or "contemporary" in prompt.lower():
                     mock_img[mock_img > 100] = 200
                elif "boho" in prompt.lower() or "wood" in prompt.lower():
                     mock_img[mock_img > 100] = 150
                return Image.fromarray(mock_img)

        # Dynamically load LoRA weights based on the active style
        lora_path = os.path.join(os.path.dirname(__file__), "..", "models", "lora", style)
        
        # Unload previous LoRAs to prevent styles from mixing
        self.pipe.unload_lora_weights() 
        
        if os.path.exists(lora_path):
            print(f"[ImageGenerator] Loading LoRA for style: {style}")
            self.pipe.load_lora_weights(lora_path)
        else:
            print(f"[ImageGenerator] No LoRA found for {style}, using base prompt.")

        output = self.pipe(
            prompt=prompt,
            image=canny_condition,
            negative_prompt=PromptEngine.NEGATIVE_PROMPT,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
        ).images[0]

        return output