export type ImageModelProvider = 'gemini' | 'openai' | 'flux';
export interface ImageModelDefinition {
    id: string;
    label: string;
    provider: ImageModelProvider;
    description: string;
    supportsEdit: boolean;
    supportsGenerate: boolean;
    defaultAspectRatios: readonly ('1:1' | '9:16' | '4:5' | '16:9')[];
}
export declare const IMAGE_MODELS: readonly ImageModelDefinition[];
export declare const DEFAULT_IMAGE_MODEL_ID = "gpt-5.4-image-2";
export declare const IMAGE_MODEL_BY_ID: Record<string, ImageModelDefinition>;
export declare function getImageModel(id: string): ImageModelDefinition | undefined;
export declare function isValidImageModel(id: string): boolean;
export declare function assertImageModel(id: string, opts?: {
    requireEdit?: boolean;
}): ImageModelDefinition;
