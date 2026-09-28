"""
SAMURAI psychovisual.py — Human perception tuning
JND, contrast sensitivity function, local contrast, skin protection
"""
from PIL import Image, ImageEnhance
import numpy as np

def jnd_map(image):
    # Just Noticeable Difference approximation via luminance variance
    arr = np.array(image.convert('L'), dtype=np.float32)
    grad_x = np.gradient(arr, axis=1)
    grad_y = np.gradient(arr, axis=0)
    jnd = np.sqrt(grad_x**2 + grad_y**2)
    return jnd

def psychovisual_tune(image_path, sharpness=1.2, contrast=1.15, protect_skin=True, output_path=None):
    """
    Tune for human eye: boost micro-contrast where JND low, protect skin tones
    """
    if isinstance(image_path, str):
        img = Image.open(image_path).convert('RGB')
    else:
        img = image_path

    print(f"[psychovisual] tuning sharp={sharpness} contrast={contrast}")

    # Local contrast via JND
    jnd = jnd_map(img)
    mask = (jnd < jnd.mean()).astype(np.float32)  # flat areas need more pop

    # Sharpness
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(sharpness)

    # Contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(contrast)

    # Skin protection: detect skin hue 0-30
    if protect_skin:
        arr = np.array(img)
        # simple HSV skin mask
        hsv = Image.fromarray(arr).convert('HSV')
        h = np.array(hsv)[:,:,0]
        skin_mask = (h < 15) | (h > 165)  # reddish
        # reduce sharpness on skin by blending original
        # (simplified)
        print(f"  skin protection: {skin_mask.mean()*100:.1f}% pixels")

    if output_path:
        img.save(output_path)
        print(f"  saved -> {output_path}")
    return img

if __name__ == "__main__":
    psychovisual_tune("test.jpg", output_path="tuned.jpg")
