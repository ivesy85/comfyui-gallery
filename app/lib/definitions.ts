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
    raw_json: any;
};