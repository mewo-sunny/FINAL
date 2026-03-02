import { runOffline } from "../ml/offlineModel";
import { runOnline } from "../ml/onlineModel";
import { isOnline } from "../services/network";

export async function predict(input) {
  if (await isOnline()) {
    return await runOnline(input);
  } else {
    return await runOffline(input);
  }
}
