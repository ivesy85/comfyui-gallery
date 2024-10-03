export type Generation = {
    id: number;
    file_type_id: number;
    name: string;
    file_location: string;
    width: number;
    height: number;
    framerate: number | null;
    rating: number | null;
    date_created: string;
    size: number;
    raw_json: RawComfyUIJson;
};

export type RawComfyUIJson = {
    ImageWidth: number;
    ImageHeight: number;
    BitDepth: number;
    ColorType: string;
    Compression: string;
    Filter: string;
    Interlace: string;
    DateTimeOriginal: Date | undefined;
    prompt: string | {[key: string]: RawComfyUIPromptJson};
    workflow: string;
};

export type RawComfyUIPromptJson = 
    | {
        class_type: 'CheckpointLoaderSimple';
        inputs: CheckpointLoaderSimpleInput;
    }
    | {
        class_type: 'CLIPSetLastLayer';
        inputs: CLIPSetLastLayerInput;
    }
    | {
        class_type: 'LoraLoader';
        inputs: LoraLoaderInput;
    };

    export type CheckpointLoaderSimpleInput = {
        ckpt_name: string;
    };

    export type CLIPSetLastLayerInput = {
        stop_at_clip_layer: number;
        clip: [string, number];
    };

    export type LoraLoaderInput = {
        lora_name: string;
        strength_model: number;
        strength_clip: number;
        model: [string, number];
        clip: [string, number];
    };
