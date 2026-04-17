class PromptEngine:
    def __init__(self):
        self.style_descriptions = {
            "scandinavian": "modern Scandinavian style, light wooden floors, white walls, minimalistic furniture, cozy textiles, hygge, natural lighting, clean lines, functional design",
            "modern": "mid-century modern interior, sleek furniture, high contrast, elegant decor, sophisticated lighting, open space, neutral palette with bold accents",
            "boho": "bohemian style, vibrant patterns, eclectic decor, many plants, layered textures, warm earthy tones, rattan furniture, relaxed and cozy atmosphere",
            "industrial": "industrial loft style, exposed brick walls, metal accents, dark leather furniture, reclaimed wood, raw materials, Edison bulbs, grey and black tones"
        }

    def generate_prompt(self, style, scene_data):
        style_desc = self.style_descriptions.get(style.lower(), self.style_descriptions['modern'])
        
        objects = [obj['label'] for obj in scene_data.get('objects', [])]
        objects_str = ", ".join(objects) if objects else "interior furniture"
        
        prompt = f"A professional high-quality photo of a {style_desc}. The room contains {objects_str}. 8k resolution, architectural photography, hyper-realistic, interior design magazine style."
        negative_prompt = "blurry, low quality, distorted, messy, cluttered, dark, gloomy, lowres, text, watermark, logo, grainy"
        
        return prompt, negative_prompt
