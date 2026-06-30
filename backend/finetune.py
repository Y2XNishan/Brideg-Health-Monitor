import os
import sys
from pathlib import Path

# Force D: drive for all caches BEFORE any imports
os.environ["HF_HOME"] = "D:/huggingface_cache"
os.environ["HF_HUB_CACHE"] = "D:/huggingface_cache/hub"
os.environ["TRANSFORMERS_CACHE"] = "D:/huggingface_cache"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["BITSANDBYTES_NOWELCOME"] = "1"

BASE_DIR = Path(__file__).resolve().parent
TRAINING_DATA_PATH = BASE_DIR / "training_data.jsonl"
OUTPUT_DIR = BASE_DIR / "models" / "bridgeiq_lora"
MODEL_NAME = "meta-llama/Llama-3.2-3B-Instruct"

import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"GPU: {torch.cuda.get_device_name(0)}")
print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")

from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer, SFTConfig

def format_example(example):
    instruction = example.get("instruction") or example.get("prompt") or example.get("question") or ""
    response = example.get("response") or example.get("completion") or example.get("answer") or ""
    return [f"### Instruction:\n{instruction}\n\n### Response:\n{response}"]

def main():
    if not TRAINING_DATA_PATH.exists():
        raise FileNotFoundError(f"Not found: {TRAINING_DATA_PATH}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading dataset...")
    dataset = load_dataset("json", data_files=str(TRAINING_DATA_PATH), split="train")
    print(f"Dataset size: {len(dataset)} examples")

    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        use_fast=True,
    )
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    print("Loading model in 4-bit...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=False,
    )

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        quantization_config=bnb_config,
        device_map={"": 0},
        trust_remote_code=True,
    )
    print("Model loaded!")

    model.config.use_cache = False
    model.config.pretraining_tp = 1
    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=4,
        lora_alpha=8,
        target_modules=["q_proj", "v_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    training_args = SFTConfig(
        output_dir=str(OUTPUT_DIR),
        num_train_epochs=3,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=2e-4,
        max_seq_length=256,
        fp16=True,
        logging_steps=5,
        save_strategy="epoch",
        report_to="none",
        optim="paged_adamw_8bit",
        dataloader_num_workers=0,
        gradient_checkpointing=False,
        warmup_steps=5,
    )

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        tokenizer=tokenizer,
        formatting_func=format_example,
    )

    print("Starting training...")
    trainer.train()

    print("Saving model...")
    trainer.save_model(str(OUTPUT_DIR))
    tokenizer.save_pretrained(str(OUTPUT_DIR))
    print(f"Done! Saved to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()