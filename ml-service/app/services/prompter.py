class PromptEngine:
    """
    Builds a conditioning prompt for Stable Diffusion based on
    detected furniture objects and the target interior design style.
    """

    # Detailed style descriptions that steer the diffusion model's aesthetic.
    STYLE_DESCRIPTIONS: dict[str, str] = {
        "scandinavian": (
            "modern Scandinavian style, light wooden floors, white walls, "
            "minimalistic furniture, cozy textiles, hygge, natural lighting, "
            "clean lines, functional design"
        ),
        "modern": (
            "mid-century modern interior, sleek furniture, high contrast, "
            "elegant decor, sophisticated lighting, open space, "
            "neutral palette with bold accents"
        ),
        "boho": (
            "bohemian style, vibrant patterns, eclectic decor, many plants, "
            "layered textures, warm earthy tones, rattan furniture, "
            "relaxed and cozy atmosphere"
        ),
        "industrial": (
            "industrial loft style, exposed brick walls, metal accents, "
            "dark leather furniture, reclaimed wood, raw materials, "
            "Edison bulbs, grey and black tones"
        ),
        "contemporary": (
            "contemporary interior, neutral tones, clean geometry, "
            "open floor plan, floor-to-ceiling windows, curated accessories"
        ),
        "mid-century-modern": (
            "mid-century modern style, organic shapes, tapered legs, "
            "warm wood tones, retro color accents, functional art pieces"
        ),
        "traditional": (
            "classic traditional interior, rich wood furniture, symmetrical layout, "
            "ornate details, warm color palette, antique accents, formal arrangement"
        ),
        "mediterranean": (
            "Mediterranean style, warm terracotta tones, arched doorways, "
            "mosaic tiles, wrought iron accents, lush plant life, rustic textures"
        ),
    }

    NEGATIVE_PROMPT = (
        "blurry, low quality, distorted, messy, cluttered, dark, gloomy, "
        "lowres, text, watermark, logo, grainy, deformed, ugly, bad anatomy"
    )

    @staticmethod
    def build_prompt(detected_objects: list[str], target_style: str) -> str:
        """
        Constructs a detailed text prompt for the image generation model.

        Args:
            detected_objects: List of object labels from the detector, e.g. ["sofa", "chair"].
            target_style:     The interior design style key, e.g. "modern".

        Returns:
            A single prompt string ready for the diffusion pipeline.
        """
        # Look up detailed style description; fall back to generic if not found
        style_desc = PromptEngine.STYLE_DESCRIPTIONS.get(
            target_style.lower().replace(" ", "-"),
            f"{target_style} interior design style"
        )

        objects_str = (
            ", ".join(detected_objects)
            if detected_objects
            else "standard room furnishings"
        )

        prompt = (
            f"A highly detailed, professional interior design photograph. "
            f"Style: {style_desc}. "
            f"The room contains: {objects_str}. "
            f"8K resolution, architectural digest quality, cinematic lighting, "
            f"photorealistic textures, ultra-sharp, award-winning interior photography."
        )
        return prompt