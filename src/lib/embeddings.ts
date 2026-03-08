import { pipeline } from "@huggingface/transformers";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL = "Xenova/bge-small-en-v1.5";

let extractor: FeatureExtractionPipeline | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", MODEL, { dtype: "fp32" });
  }
  return extractor;
}

// Dispose the ONNX session
export async function disposeEmbedder(): Promise<void> {
  if (extractor) {
    await extractor.dispose();
    extractor = null;
  }
}

// Generate an embedding for a string
export async function embed(text: string): Promise<Buffer> {
  const ext = await getExtractor();
  const output = await ext(text, { pooling: "mean", normalize: true });
  const vector = new Float32Array(output.data as Float32Array);
  return Buffer.from(vector.buffer);
}
