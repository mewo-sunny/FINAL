import { Platform } from 'react-native'; // <--- THIS WAS MISSING

export const getCurrencyFromAPI = async (photoUri) => {
  const data = new FormData();
  
  // Use the Platform check to format the URI correctly for Android
  const formattedUri = Platform.OS === 'android' ? `file://${photoUri}` : photoUri;

  data.append('file', {
    uri: formattedUri,
    name: 'currency_scan.jpg',
    type: 'image/jpeg',
  });

  console.log("Sending request to API with URI:", formattedUri);

  try {
    const response = await fetch('http://192.168.137.1:5000/predict', {
      method: 'POST',
      body: data,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const json = await response.json();
    return json.result; // This should match the key in your Flask response
  } catch (e) {
    console.error("API Fetch Error:", e);
    return "Connection Error";
  }
};