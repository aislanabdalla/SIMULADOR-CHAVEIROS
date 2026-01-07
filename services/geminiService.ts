
import { GoogleGenAI } from "@google/genai";
import { PrintSettings, ShapeType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getPositionDescription = (pos: {x: number, y: number} | undefined): string => {
  if (!pos) return "Top-Right corner";
  let angle = Math.atan2(pos.y, pos.x) * (180 / Math.PI);
  const normAngle = (angle < 0 ? angle + 360 : angle) % 360;

  if (normAngle >= 337.5 || normAngle < 22.5) return "Right edge (3 o'clock)";
  if (normAngle >= 22.5 && normAngle < 67.5) return "Bottom-Right corner (4:30)";
  if (normAngle >= 67.5 && normAngle < 112.5) return "Bottom edge (6 o'clock)";
  if (normAngle >= 112.5 && normAngle < 157.5) return "Bottom-Left corner (7:30)";
  if (normAngle >= 157.5 && normAngle < 202.5) return "Left edge (9 o'clock)";
  if (normAngle >= 202.5 && normAngle < 247.5) return "Top-Left corner (10:30)";
  if (normAngle >= 247.5 && normAngle < 292.5) return "Top edge (12 o'clock)";
  return "Top-Right corner (1:30)";
};

export const generateKeyringRender = async (
  logoBase64: string,
  settings: PrintSettings,
  approvedReferences: string[] = []
): Promise<string> => {
  try {
    const cleanBase64 = logoBase64.split(',')[1] || logoBase64;
    
    const shapeDescription = settings.shape === ShapeType.CONTOUR 
      ? "Custom organic contour shape that closely follows the outline of the logo with a smooth 2mm offset border (brim style)" 
      : `${settings.shape} shape`;

    const holePos = getPositionDescription(settings.holePosition);

    let prompt = `
      *** CRITICAL PRIORITY INSTRUCTION: FLUSH FACE-DOWN PRINT ON TEXTURED PEI ***
      1. SURFACE TOPOLOGY: The visible face of this keychain is printed FACE-DOWN against a TEXTURED PEI PLATE.
      2. ZERO RELIEF: The surface is completely FLUSH, FLAT, and LEVEL. There is ABSOLUTELY NO embossing, NO debossing, and NO height difference between the logo colors and the base.
      3. SINGLE LAYER: All colors appear as if fused into a single layer (Marquetry/Inlay effect).
      4. FINISH: The entire surface has a uniform, sparkly/matte rough texture characteristic of PEI powder-coated sheets.

      *** 3D PRINTER MANUFACTURING SPECS ***
      - Nozzle Diameter: 0.4mm.
      - Layer Height: 0.16mm (Fine detail settings).
      - First Layer Flow: 100% (Filament lines are perfectly squished and fused, no gaps).
      - Material: Opaque PLA/PETG Filament.
      - Imperfections: Simulate subtle FDM characteristics like slight corner bulging or faint layer lines on the side walls.

      *** SCENE & OBJECT DEFINITION ***
      Task: Create a photorealistic macro photography shot of a custom 3D printed keychain lying on a wooden table.
      
      Object Details:
      - Shape: ${shapeDescription}.
      - Base Color: ${settings.baseColor} (Textured Plastic).
      - Logo: The provided logo is embedded flush into the base.
      - Hardware: 
          1. A small hole located at the ${holePos}.
          2. A silver metal chain consisting of EXACTLY 6 LINKS connecting the plastic body to a standard split ring.
      
      Lighting: Soft studio lighting positioned to reveal the uniform rough PEI texture across the flat surface.
      View: Top-down close-up.
      Output Aspect Ratio: 1:1 Square.
    `;

    if (approvedReferences.length > 0) {
      prompt += `
      *** STYLE CONSISTENCY ***
      The user has approved previous generations. You MUST strictly adhere to the visual style, material rendering, lighting conditions, and texture intensity shown in the attached "Approved Reference" images. Ensure the new render looks like it belongs to the exact same product line and photoshoot as the references.
      `;
    }

    const contentsParts: any[] = [{ text: prompt }];

    // Add approved references for context (limit to last 2 to keep context clear)
    approvedReferences.slice(-2).forEach((ref, index) => {
      const cleanRef = ref.split(',')[1] || ref;
      contentsParts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanRef,
        },
      });
    });

    // Add the current logo to process
    contentsParts.push({
      inlineData: {
        mimeType: 'image/png',
        data: cleanBase64,
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: contentsParts },
      config: {
        imageConfig: {
          aspectRatio: '1:1'
        }
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image data received from Gemini.");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
