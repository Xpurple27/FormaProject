import assert from "node:assert/strict";
import sharp from "sharp";

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url !== "https://openrouter.ai/api/v1/chat/completions") return originalFetch(input, init);

  const request = new Request(input, init);
  const body = await request.json();
  assert.equal(request.headers.get("authorization"), "Bearer forma-offline-test");
  assert.equal(body.model, "google/gemma-4-31b-it:free");
  assert.deepEqual(body.provider.max_price, { prompt: 0, completion: 0, image: 0, request: 0 });
  assert.equal(body.response_format.type, "json_object");
  assert.equal(body.reasoning.effort, "none");

  const [prompt, image] = body.messages[0].content;
  assert.match(image.image_url.url, /^data:image\/jpeg;base64,/);
  const bytes = Buffer.from(image.image_url.url.split(",")[1], "base64");
  const info = await sharp(bytes).metadata();
  assert.equal(info.format, "jpeg");
  assert.equal(info.width, 1024);
  assert.equal(info.exif, undefined);

  const foodIndex = name => {
    const row = prompt.text.split("\n").find(line => line.endsWith(". " + name));
    assert.ok(row, `Expected ${name} in public catalog`);
    return Number(row.split(".")[0]);
  };
  const combo = foodIndex("Nasi putih + ayam goreng");
  return Response.json({ choices: [{ message: { content: JSON.stringify({
    matches: [combo, foodIndex("Tempe goreng"), foodIndex("Nasi putih matang"), combo, 999], unmatched: ["Sambal kacang"],
  }) } }] });
};
