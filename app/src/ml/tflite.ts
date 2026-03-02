import { loadTensorflowModel } from "react-native-fast-tflite";
import { Asset } from 'expo-asset';

let model: any = null;
let labels: string[] = [];

export async function loadModel() {
  if (model) return model;

  try {
    // Load the model
    console.log('Loading TFLite model...');
    model = await loadTensorflowModel(require("../../assets/currency.tflite"));
    console.log('Model loaded successfully');

    // Load and clean labels
    const labelAsset = Asset.fromModule(require("../../assets/labels.txt"));
    await labelAsset.downloadAsync();
    
    const response = await fetch(labelAsset.localUri!);
    const text = await response.text();
    
    labels = text
      .split("\n")
      .map(l => l.replace('\r', '').trim())
      .filter(l => l.length > 0);
    
    console.log("Labels loaded:", labels);
    
    return model;
  } catch (e) {
    console.error("Failed to load model or labels:", e);
    throw e;
  }
}

export function getLabels() {
  return labels;
}

export function runInference(data: any) {
  if (!model) {
    throw new Error("Model not loaded");
  }

  try {
    // Run inference
    const output = model.runSync([data]);
    return output;
  } catch (error) {
    console.error("Inference failed:", error);
    throw error;
  }
}

export default {
  loadModel,
  getLabels,
  runInference
};