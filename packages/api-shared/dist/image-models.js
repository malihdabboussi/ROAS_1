"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_MODEL_BY_ID = exports.DEFAULT_IMAGE_MODEL_ID = exports.IMAGE_MODELS = void 0;
exports.getImageModel = getImageModel;
exports.isValidImageModel = isValidImageModel;
exports.assertImageModel = assertImageModel;
exports.IMAGE_MODELS = [
    {
        id: 'gemini-3.1-flash-image-preview',
        label: 'Gemini 3.1 Flash',
        provider: 'gemini',
        description: 'Fast iteration, good for drafts and variations.',
        supportsEdit: true,
        supportsGenerate: true,
        defaultAspectRatios: ['1:1', '9:16', '4:5'],
    },
    {
        id: 'gemini-3-pro-image-preview',
        label: 'Gemini 3 Pro',
        provider: 'gemini',
        description: 'Higher fidelity, slower.',
        supportsEdit: true,
        supportsGenerate: true,
        defaultAspectRatios: ['1:1', '9:16', '4:5'],
    },
    {
        id: 'gpt-5.4-image-2',
        label: 'GPT Image 2',
        provider: 'openai',
        description: 'Best for legible on-image text.',
        supportsEdit: true,
        supportsGenerate: true,
        defaultAspectRatios: ['1:1', '9:16'],
    },
    {
        id: 'flux-nano-banana-2',
        label: 'Flux Nano Banana 2',
        provider: 'flux',
        description: 'Premium photoreal, cinematic visual contrast.',
        supportsEdit: false,
        supportsGenerate: true,
        defaultAspectRatios: ['1:1', '4:5', '9:16'],
    },
];
exports.DEFAULT_IMAGE_MODEL_ID = 'gemini-3.1-flash-image-preview';
exports.IMAGE_MODEL_BY_ID = Object.fromEntries(exports.IMAGE_MODELS.map((m) => [m.id, m]));
function getImageModel(id) {
    return exports.IMAGE_MODEL_BY_ID[id];
}
function isValidImageModel(id) {
    return id in exports.IMAGE_MODEL_BY_ID;
}
function assertImageModel(id, opts) {
    const model = getImageModel(id);
    if (!model)
        throw new Error(`Unknown image model: ${id}`);
    if (opts?.requireEdit && !model.supportsEdit) {
        throw new Error(`Model ${id} does not support image edit`);
    }
    return model;
}
//# sourceMappingURL=image-models.js.map