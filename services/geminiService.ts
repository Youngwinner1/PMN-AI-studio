import { GoogleGenAI, Type, Modality } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const suggestStyle = async (imageBase64: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64,
            },
          },
          {
            text: `Analyse l'apparence de cette personne (vêtements, expression, posture) et suggère l'ambiance de shooting photo la plus adaptée. Les ambiances possibles sont : 'Professionnel & Sobre', 'Éditorial de Mode', 'Portrait Cinématographique', 'Authentique & Naturel'. Réponds uniquement avec le nom de l'ambiance.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            style: {
              type: Type.STRING,
              description: "L'ambiance de photo suggérée en français (e.g., 'Professionnel & Sobre')."
            },
          },
          required: ["style"],
        },
      },
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    return result.style;
  } catch (error) {
    console.error("Error suggesting style:", error);
    throw new Error("Failed to suggest a style. Please try again.");
  }
};

export const enhanceImage = async (
    imageBase64: string, 
    mimeType: string, 
    ambiance: string, 
    lighting: string,
    background: string
): Promise<string> => {
  try {
    const ambiancePrompts: { [key: string]: string } = {
        'Professionnel & Sobre': "Le style général est un portrait corporate impeccable, avec une esthétique nette, moderne et professionnelle, idéal pour un profil business.",
        'Éditorial de Mode': "Le style est celui d'un éditorial de mode audacieux, style magazine, avec des couleurs riches, un contraste élevé et une pose affirmée.",
        'Portrait Cinématographique': "Le style est un portrait artistique avec une ambiance de film, un grain subtil, une colorimétrie travaillée et une profondeur émotionnelle.",
        'Authentique & Naturel': "Le style est un portrait lifestyle capturant un moment spontané, avec une esthétique authentique et une atmosphère détendue.",
    };

    const lightingPrompts: { [key: string]: string } = {
        'Lumière Douce & Flatteuse': "L'éclairage principal est doux et diffus, type 'beauty dish', enveloppant le sujet pour minimiser les ombres dures et flatter le teint.",
        'Clair-Obscur Dramatique': "L'éclairage est de type Rembrandt ou clair-obscur, créant un fort contraste entre l'ombre et la lumière pour un effet intense et sculptural.",
        'Contre-jour Ambré': "Un éclairage en contre-jour est utilisé, avec une lueur chaude et dorée ('golden hour') qui dessine les contours du sujet et crée un halo lumineux.",
        'Néon Futuriste': "L'éclairage est créatif, utilisant des sources de lumière néon colorées (rose, bleu, violet) pour une ambiance cyberpunk et moderne.",
    };

    const backgroundPrompts: { [key: string]: string } = {
        'Gris Classique': "Le fond est un gris de studio neutre, uni et professionnel.",
        'Noir Intense': "Le fond est un noir profond, uni et sans reflets pour un effet dramatique.",
        'Blanc Épuré': "Le fond est un blanc pur et lumineux, style 'high-key', sans ombres portées.",
        'Toile Peinte': "Le fond ressemble à une toile de fond peinte classique ('backdrop') utilisée en studio, avec une texture et des nuances subtiles.",
        'Bureau Moderne': "Le fond est un bureau moderne et lumineux, avec une faible profondeur de champ pour un effet professionnel (bokeh).",
        'Ambiance Urbaine': "Le fond est une scène de rue urbaine nocturne, avec des lumières de la ville en bokeh, créant une ambiance chic et moderne.",
        'Jardin Botanique': "Le fond est un mur de plantes luxuriantes ou une serre de jardin botanique, avec un éclairage de studio doux.",
        'Néon Artistique': "Le fond est sombre avec des lignes de néon colorées et abstraites, en harmonie avec l'éclairage.",
    };

    const ambianceInstruction = ambiancePrompts[ambiance] || ambiancePrompts['Authentique & Naturel'];
    const lightingInstruction = lightingPrompts[lighting] || lightingPrompts['Lumière Douce & Flatteuse'];
    const backgroundInstruction = backgroundPrompts[background] || backgroundPrompts['Gris Classique'];

    const fullPrompt = `En tant que photographe de studio expert, retouche cette photo.
    ${ambianceInstruction}
    ${lightingInstruction}
    ${backgroundInstruction}
    Le visage doit être parfaitement net, naturel et sans imperfections, tout en préservant l'identité et les traits exacts de la personne. Améliore la netteté globale, la texture de la peau de manière hyper-réaliste et le réalisme général pour un rendu haut de gamme, moderne et authentique.
    **IMPORTANT : Ne modifie absolument pas les traits du visage, la forme des yeux, du nez, de la bouche, ni l'expression de la personne. L'identité doit être parfaitement préservée.**
    Le résultat final doit être un photoshoot professionnel, crédible, authentique et d'une qualité studio exceptionnelle.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType,
            },
          },
          { text: fullPrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("Aucune image n'a été générée par le modèle.");
  } catch (error) {
    console.error("Error enhancing image:", error);
    throw new Error("La création de l'image a échoué. Veuillez réessayer.");
  }
};