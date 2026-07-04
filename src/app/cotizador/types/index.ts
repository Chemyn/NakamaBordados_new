export interface ClientDetails {
  name: string;
  phone: string;
  email: string;
}

export interface GarmentPosition {
  active: boolean;
  type: 'Bordado' | 'DTF';
  size: string; // dimensions in CM (e.g. "10x10")
  file: File | null;
  filePreview: string; // base64 data URL
}

export interface GarmentCustomization {
  model: string;
  color: string;
  quantity: number;
  positions: {
    [positionKey: string]: GarmentPosition;
  };
  additionalDetails: string;
}

export interface PatchCustomization {
  shape: 'Rectangular' | 'Cuadrado' | 'Circular' | 'Forma del diseño';
  width: string; // CM
  height: string; // CM
  quantity: number;
  file: File | null;
  filePreview: string;
  additionalDetails: string;
}

export interface CapPosition {
  active: boolean;
  type: 'Bordado' | 'TPU';
  size: 'Grande' | 'Regular' | 'Pequeño';
  file: File | null;
  filePreview: string;
}

export interface CapCustomization {
  option: 'Bordado Al frente' | 'Bordado Al frente y un costado' | 'Bordado Al frente y ambos costados';
  model: string;
  quantity: number;
  add3D: boolean; // Si / No
  positions: {
    [positionKey: string]: CapPosition;
  };
  additionalDetails: string;
}

export type ProductType = 'ropa' | 'parches' | 'gorras';
