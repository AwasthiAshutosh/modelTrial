import os
import subprocess
import argparse

# ---------------------------------------------------------------------------
# Stable Diffusion LoRA Training via DreamBooth
#
# This script is a launcher for the official HuggingFace DreamBooth LoRA
# training script. It is designed to be run on a machine with a GPU,
# preferably inside the Kaggle or Google Colab environment.
#
# BEFORE running this, download the official script:
#   wget https://raw.githubusercontent.com/huggingface/diffusers/main/examples/\
#        dreambooth/train_dreambooth_lora.py
#
# Dataset structure required:
#   data/generation/
#     scandinavian/    ← 20-30 interior photos + matching .txt caption files
#     modern/
#     boho/
#     industrial/
#
# Outputs saved to:
#   models/lora/<style>/   ← Load these via pipe.load_lora_weights(path)
# ---------------------------------------------------------------------------

PRETRAINED_MODEL = "runwayml/stable-diffusion-v1-5"
TRAINING_SCRIPT = "train_dreambooth_lora.py"


def train_lora(
    instance_data_dir: str,
    output_dir: str,
    pretrained_model_name: str = PRETRAINED_MODEL,
    resolution: int = 512,
    max_train_steps: int = 500,
    learning_rate: float = 1e-4,
    dry_run: bool = False,
) -> int:
    """
    Launches LoRA fine-tuning for a single interior design style.

    Args:
        instance_data_dir:    Path to folder containing style images + captions.
        output_dir:           Where to save the trained LoRA adapter weights.
        pretrained_model_name: HuggingFace model ID to start from.
        resolution:           Training image size (512 recommended for SD 1.5).
        max_train_steps:      Total gradient update steps (500 is a good start).
        learning_rate:        LoRA learning rate (1e-4 is standard).
        dry_run:              If True, prints the command without executing.

    Returns:
        0 on success, non-zero on failure.
    """
    style_name = os.path.basename(instance_data_dir.rstrip("/\\"))
    instance_prompt = f"a photo of a room in {style_name} interior design style"
    validation_prompt = f"A beautiful {style_name} style living room, professional photography"

    if not os.path.isfile(TRAINING_SCRIPT):
        print(
            f"ERROR: '{TRAINING_SCRIPT}' not found in the current directory.\n"
            "Download it with:\n"
            "  wget https://raw.githubusercontent.com/huggingface/diffusers/main/"
            "examples/dreambooth/train_dreambooth_lora.py"
        )
        return 1

    if not os.path.isdir(instance_data_dir):
        print(f"ERROR: Data directory '{instance_data_dir}' does not exist.")
        return 1

    cmd = [
        "accelerate", "launch", TRAINING_SCRIPT,
        f"--pretrained_model_name_or_path={pretrained_model_name}",
        f"--instance_data_dir={instance_data_dir}",
        f"--output_dir={output_dir}",
        f"--instance_prompt={instance_prompt}",
        f"--resolution={resolution}",
        "--train_batch_size=1",
        "--gradient_accumulation_steps=1",
        "--checkpointing_steps=100",
        f"--learning_rate={learning_rate}",
        "--report_to=tensorboard",
        "--lr_scheduler=constant",
        "--lr_warmup_steps=0",
        f"--max_train_steps={max_train_steps}",
        f"--validation_prompt={validation_prompt}",
        "--validation_epochs=50",
        "--seed=42",
    ]

    print(f"\n[LoRA Training] Style: {style_name}")
    print(f"[LoRA Training] Data:  {instance_data_dir}")
    print(f"[LoRA Training] Steps: {max_train_steps}")
    print(f"[LoRA Training] Output: {output_dir}\n")
    print("Command:\n  " + " \\\n    ".join(cmd) + "\n")

    if dry_run:
        print("[dry-run] Skipping execution.")
        return 0

    os.makedirs(output_dir, exist_ok=True)
    result = subprocess.run(cmd)
    return result.returncode


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train SD LoRA for an interior style.")
    parser.add_argument("--style", type=str, default="scandinavian",
                        help="Style name matching a subfolder in data/generation/")
    parser.add_argument("--steps", type=int, default=500,
                        help="Number of training steps")
    parser.add_argument("--lr", type=float, default=1e-4,
                        help="Learning rate")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print the command without executing")
    args = parser.parse_args()

    data_dir = f"data/generation/{args.style}"
    out_dir  = f"models/lora/{args.style}"

    exit_code = train_lora(
        instance_data_dir=data_dir,
        output_dir=out_dir,
        max_train_steps=args.steps,
        learning_rate=args.lr,
        dry_run=args.dry_run,
    )
    exit(exit_code)
