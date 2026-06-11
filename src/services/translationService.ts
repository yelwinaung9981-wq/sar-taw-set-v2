export async function translateProductName(
  englishName: string, 
  retries = 3
): Promise<{ mmName: string; thName: string; zhName: string; msName: string }> {
  try {
    const response = await fetch("/api/gemini/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: englishName }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return {
      mmName: data.mmName || englishName,
      thName: data.thName || englishName,
      zhName: data.zhName || englishName,
      msName: data.msName || englishName,
    };
  } catch (error: any) {
    console.error("Translation error on client-side:", error);
    
    if (retries > 0) {
      const delay = Math.pow(2, 4 - retries) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return translateProductName(englishName, retries - 1);
    }
    
    return {
      mmName: englishName,
      thName: englishName,
      zhName: englishName,
      msName: englishName,
    };
  }
}

