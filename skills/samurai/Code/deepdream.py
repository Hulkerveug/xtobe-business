"""
SAMURAI deepdream.py — DeepDream iterative enhancement
Uses PyTorch + Inception if available, else OpenCV fallback
"""
import numpy as np
from PIL import Image

try:
    import torch, torchvision
    HAS_TORCH = True
except:
    HAS_TORCH = False

def deepdream(image_path, iterations=10, layer='mixed4c', lr=0.05, octave_scale=1.4):
    """
    image_path: str or PIL Image
    iterations: dream steps
    layer: inception layer to amplify
    """
    print(f"[deepdream] Loading {image_path} | torch={HAS_TORCH}")
    if isinstance(image_path, str):
        img = Image.open(image_path).convert('RGB')
    else:
        img = image_path

    if not HAS_TORCH:
        # Fallback: edge enhance + contrast boost simulates dream
        import cv2
        arr = np.array(img)
        for i in range(iterations):
            arr = cv2.detailEnhance(arr, sigma_s=10, sigma_r=0.15)
        return Image.fromarray(arr)

    # Torch path
    model = torchvision.models.inception_v3(weights='DEFAULT')
    model.eval()
    # hook layer
    activation = {}
    def hook_fn(m,i,o): activation['feat']=o
    dict(model.named_children())['Mixed_6b'].register_forward_hook(hook_fn)

    x = torchvision.transforms.ToTensor()(img).unsqueeze(0)
    x.requires_grad_(True)
    for i in range(iterations):
        model(x)
        loss = activation['feat'].norm()
        loss.backward()
        with torch.no_grad():
            x += lr * x.grad / (x.grad.norm()+1e-8)
            x.grad.zero_()
        print(f"  dream iter {i+1}/{iterations} loss={loss.item():.2f}")
    out = x.squeeze().detach().permute(1,2,0).numpy()
    out = np.clip(out,0,1)
    return Image.fromarray((out*255).astype(np.uint8))

if __name__ == "__main__":
    import sys
    deepdream(sys.argv[1] if len(sys.argv)>1 else "test.jpg").save("dream.jpg")
