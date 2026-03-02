// src/ml/CurrencyDetector.ts
import { runInference, loadModel } from './tflite';

interface DetectionResult {
  label: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

class CurrencyDetector {
  private modelLoaded: boolean = false;
  private model: any = null;

  async initialize() {
    try {
      await loadModel();
      this.modelLoaded = true;
      console.log('Currency detector initialized successfully');
    } catch (error) {
      console.error('Failed to initialize currency detector:', error);
      throw error;
    }
  }

  async detectCurrency(imageData: Uint8Array | Float32Array): Promise<DetectionResult | null> {
    try {
      if (!this.modelLoaded) {
        await this.initialize();
      }

      const result = runInference(imageData);

      if (!result) {
        console.warn('No detection result');
        return null;
      }

      console.log('Detection result:', result);
      return {
        label: result.label,
        confidence: result.confidence,
      };
    } catch (error) {
      console.error('Model execution failed details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        modelLoaded: this.modelLoaded,
      });
      throw error;
    }
  }

  isReady(): boolean {
    return this.modelLoaded;
  }
}

export default new CurrencyDetector();