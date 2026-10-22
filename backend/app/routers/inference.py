from app.routers.models import _models_dir
from PIL.Image import logger
class _MobileNetV3Silage(torch.nn.Module if "torch" in globals() else object):
    def __init__(self, num_classes=5, architecture="large"):
        super().__init__()
        import torchvision.models as tv_models
        self.architecture = architecture
        if architecture == "large":
            backbone = tv_models.mobilenet_v3_large(weights=None)
            in_features = 960
            self.classifier = torch.nn.Sequential(
                torch.nn.Linear(in_features, 512),
                torch.nn.Hardswish(),
                torch.nn.Dropout(p=0.35),
                torch.nn.Linear(512, num_classes),
            )
        else:
            backbone = tv_models.mobilenet_v3_small(weights=None)
            in_features = 576
            self.classifier = torch.nn.Sequential(
                torch.nn.Linear(in_features, 256),
                torch.nn.Hardswish(),
                torch.nn.Dropout(p=0.3),
                torch.nn.Linear(256, num_classes),
            )
        self.features = backbone.features
        self.avgpool = backbone.avgpool

    def forward(self, x):
        return self.classifier(torch.flatten(self.avgpool(self.features(x)), 1))


@lru_cache(maxsize=1)
def _get_pytorch_model():
    try:
        import torch
        device = torch.device("cpu")
        model = _MobileNetV3Silage(num_classes=5, architecture="large").to(device)
        pth_path = _models_dir() / "vision" / "mobilenetv3_silage.pth"
        if pth_path.exists():
            sd = torch.load(str(pth_path), map_location=device)
            model.load_state_dict(sd)
        model.eval()
        return model
    except Exception as exc:
        logger.warning(f"PyTorch Grad-CAM model unavailable: {exc}")
        return None
@lru_cache(maxsize=1)
def _get_pytorch_model():
    try:
        import torch
        import torchvision.models as tv_models

        class _MobileNetV3Silage(torch.nn.Module):
            def __init__(self, num_classes=5, architecture="large"):
                super().__init__()
                self.architecture = architecture
                if architecture == "large":
                    backbone = tv_models.mobilenet_v3_large(weights=None)
                    in_features = 960
                    self.classifier = torch.nn.Sequential(
                        torch.nn.Linear(in_features, 512),
                        torch.nn.Hardswish(),
                        torch.nn.Dropout(p=0.35),
                        torch.nn.Linear(512, num_classes),
                    )
                else:
                    backbone = tv_models.mobilenet_v3_small(weights=None)
                    in_features = 576
                    self.classifier = torch.nn.Sequential(
                        torch.nn.Linear(in_features, 256),
                        torch.nn.Hardswish(),
                        torch.nn.Dropout(p=0.3),
                        torch.nn.Linear(256, num_classes),
                    )
                self.features = backbone.features
                self.avgpool = backbone.avgpool

            def forward(self, x):
                return self.classifier(torch.flatten(self.avgpool(self.features(x)), 1))

        device = torch.device("cpu")
        model = _MobileNetV3Silage(num_classes=5, architecture="large").to(device)
        pth_path = _models_dir() / "vision" / "mobilenetv3_silage.pth"
        if pth_path.exists():
            sd = torch.load(str(pth_path), map_location=device)
            model.load_state_dict(sd)
        model.eval()
        return model
    except Exception as exc:
        logger.warning(f"PyTorch Grad-CAM model unavailable: {exc}")
        return None