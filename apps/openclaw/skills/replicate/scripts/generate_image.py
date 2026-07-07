#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "replicate>=1.0.0",
#     "httpx>=0.27.0",
# ]
# ///
"""
Generate images via Replicate API.

Usage:
    uv run generate_image.py --prompt "your image description" --filename "output.png"
    uv run generate_image.py --prompt "..." --filename "out.webp" --model nano-banana-pro --aspect-ratio 16:9
"""

import argparse
import os
import sys
from pathlib import Path

IMAGE_MODELS = {
    "nano-banana-pro": {
        "replicate_id": "google/nano-banana-pro",
        "aspect_ratios": ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
        "default_ratio": "1:1",
    },
}


def get_api_token(provided: str | None) -> str | None:
    if provided:
        return provided
    return os.environ.get("REPLICATE_API_TOKEN")


def main():
    parser = argparse.ArgumentParser(
        description="Generate images via Replicate API"
    )
    parser.add_argument("--prompt", "-p", required=True, help="Image description/prompt")
    parser.add_argument("--filename", "-f", required=True, help="Output filename (e.g., output.png)")
    parser.add_argument(
        "--model", "-m",
        choices=list(IMAGE_MODELS),
        default="nano-banana-pro",
        help="Model to use (default: nano-banana-pro)",
    )
    parser.add_argument(
        "--aspect-ratio", "-a",
        help="Aspect ratio (e.g., 16:9). Default depends on model.",
    )
    parser.add_argument(
        "--api-token", "-k",
        help="Replicate API token (overrides REPLICATE_API_TOKEN env)",
    )

    args = parser.parse_args()

    token = get_api_token(args.api_token)
    if not token:
        print("Error: No API token provided.", file=sys.stderr)
        print("Set REPLICATE_API_TOKEN or use --api-token", file=sys.stderr)
        sys.exit(1)

    model_info = IMAGE_MODELS[args.model]
    aspect_ratio = args.aspect_ratio or model_info["default_ratio"]
    if aspect_ratio not in model_info["aspect_ratios"]:
        aspect_ratio = model_info["default_ratio"]

    output_path = Path(args.filename)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    import replicate

    client = replicate.Client(api_token=token)
    replicate_id = model_info["replicate_id"]

    input_params = {"prompt": args.prompt, "aspect_ratio": aspect_ratio}
    input_params["output_format"] = "png" if args.filename.endswith(".png") else "webp"

    print(f"Generating image with {replicate_id}...", file=sys.stderr)

    try:
        output = client.run(replicate_id, input=input_params)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    # Handle output: FileOutput (has read()), string URL, or list of FileOutput
    content = None
    if isinstance(output, list) and len(output) > 0:
        first = output[0]
        if hasattr(first, "read") and callable(first.read):
            content = first.read()
        elif isinstance(first, str):
            content = None  # will fetch via URL
        else:
            content = None
    elif output and hasattr(output, "read") and callable(output.read):
        content = output.read()
    elif isinstance(output, str):
        content = None

    if content is not None:
        output_path.write_bytes(content)
    else:
        # Get URL and download
        url = None
        if isinstance(output, str):
            url = output
        elif isinstance(output, list) and len(output) > 0:
            first = output[0]
            url = first.url() if hasattr(first, "url") and callable(first.url) else str(first)
        elif output and hasattr(output, "url"):
            url = output.url() if callable(output.url) else str(output)
        if not url:
            print("Error: No image in response", file=sys.stderr)
            sys.exit(1)
        import httpx
        print(f"Downloading to {output_path}...", file=sys.stderr)
        resp = httpx.get(url, follow_redirects=True)
        resp.raise_for_status()
        output_path.write_bytes(resp.content)

    full_path = output_path.resolve()
    print(f"\nImage saved: {full_path}")
    print(f"MEDIA: {full_path}")


if __name__ == "__main__":
    main()
