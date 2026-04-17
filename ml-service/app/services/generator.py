import torch
from diffusers import StableDiffusionControlNetPipeline, ControlNetModel, UniPCMultistepScheduler
from PIL import Image
import numpy as np
import cv2

class RoomGenerator:
    def __init__(self, model_id="runwayml/stable-diffusion-v1-5", controlnet_id="lllyasviel/sd-controlnet-canny"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch_dtype = torch.float16 if self.device == "cuda" else torch.float32
        
        # Load ControlNet
        self.controlnet = ControlNetModel.from_pretrained(
            controlnet_id, torch_dtype=self.torch_dtype
        )
        
        # Load Pipeline
        self.pipe = StableDiffusionControlNetPipeline.from_pretrained(
            model_id, controlnet=self.controlnet, torch_dtype=self.torch_dtype
        )
        
        # Use a fast scheduler
        self.pipe.scheduler = UniPCMultistepScheduler.from_config(self.pipe.scheduler.config)
        self.pipe.to(self.device)
        
        # Enable model CPU offload if on GPU to save memory if needed
        # self.pipe.enable_model_cpu_offload() 

    def load_lora(self, lora_path):
        """
        Load custom LoRA weights to modify the style.
        """
        print(f"Loading LoRA from {lora_path}...")
        self.pipe.load_lora_weights(lora_path)

    def get_canny_image(self, image):
        # Convert PIL image to numpy
        image_np = np.array(image)
        
        # Get Canny edges
        low_threshold = 100
        high_threshold = 200
        image_canny = cv2.Canny(image_np, low_threshold, high_threshold)
        
        # Reshape for ControlNet
        image_canny = image_canny[:, :, None]
        image_canny = np.concatenate([image_canny, image_canny, image_canny], axis=2)
        canny_image = Image.fromarray(image_canny)
        
        return canny_image

    def generate(self, image, prompt, negative_prompt, num_inference_steps=30, guidance_scale=7.5):
        # Preprocess input image to get layout preservation map (Canny)
        canny_image = self.get_canny_image(image)
        
        # Generate redesigned image
        output = self.pipe(
            prompt,
            image=canny_image,
            negative_prompt=negative_prompt,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
        ).images[0]
        
        return output
