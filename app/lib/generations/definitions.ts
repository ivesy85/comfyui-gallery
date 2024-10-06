// DB Types
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

export type Prompt = {
    id?: number;
    prompt: string;
};

export type KSampler = {
    id?: number;
    checkpoint_id: number;
    positive_prompt_id: number;
    negative_prompt_id: number;
    seed: number;
    steps: number;
    cfg: number;
    sampler_name: string;
    scheduler: string;
    denoise: number;
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
    }
    | {
        class_type: 'CR Apply LoRA Stack';
        inputs: CRApplyLoRAStackInput;
    }
    | {
        class_type: 'CR LoRA Stack';
        inputs: CRLoRAStackInput;
    }
    | {
        class_type: 'KSampler';
        inputs: KsamplerInput;
    }
    | {
        class_type: 'CLIPTextEncode';
        inputs: CLIPTextEncodeInput;
    };

    export type CheckpointLoaderSimpleInput = {
        key?: string;
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

    export type CRApplyLoRAStackInput = {
        clip: [string, number];
        model: [string, number];
        lora_stack: [string, number];
    }

    export type CRLoRAStackInput = {
        switch_1: 'On' | 'Off';
        switch_2: 'On' | 'Off';
        switch_3: 'On' | 'Off';
        lora_name_1: string;
        lora_name_2: string;
        lora_name_3: string;
        clip_weight_1: number;
        clip_weight_2: number;
        clip_weight_3: number;
        model_weight_1: number;
        model_weight_2: number;
        model_weight_3: number;
    };

    export type KsamplerInput = {
        cfg: number;
        seed: number | [string, number];
        model: [string, number];
        steps: number;
        denoise: number;
        negative: [string, number];
        positive: [string, number];
        scheduler: string;
        sampler_name: string;
        latent_image: [string, number];
    };

    export type LoraBase = {
        lora_name: string;
        strength_model: number;
        strength_clip: number;
    }

    export type CLIPTextEncodeInput = {
        key?: string;
        text: string;
        clip: [string, number];
    };
