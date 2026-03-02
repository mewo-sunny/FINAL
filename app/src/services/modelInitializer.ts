import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";

export async function prepareModel(): Promise<string> {
  // Change from model.onnx to currency.tflite
  const asset = Asset.fromModule(require("../../assets/currency.tflite"));
  await asset.downloadAsync();

  // @ts-ignore
  const modelPath = (FileSystem.documentDirectory || "") + "currency.tflite";

  const info = await FileSystem.getInfoAsync(modelPath);
  if (!info.exists) {
    await FileSystem.copyAsync({
      from: asset.localUri as string,
      to: modelPath,
    });
  }

  return modelPath;
}

export async function prepareLabels(): Promise<string> {
  const asset = Asset.fromModule(require("../../assets/labels.txt"));
  await asset.downloadAsync();

  // @ts-ignore
  const labelsPath = (FileSystem.documentDirectory || "") + "labels.txt";

  const info = await FileSystem.getInfoAsync(labelsPath);
  if (!info.exists) {
    await FileSystem.copyAsync({
      from: asset.localUri as string,
      to: labelsPath,
    });
  }

  return labelsPath;
}