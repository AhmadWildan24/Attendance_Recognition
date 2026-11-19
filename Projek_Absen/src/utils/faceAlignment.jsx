// src/utils/faceAlignment.js

const ARCFACE_LANDMARKS = [
  [38.2946, 51.6963], // Mata kiri
  [73.5318, 51.5014], // Mata kanan
  [56.0252, 71.7366], // Hidung
  [41.5493, 92.3655], // Mulut kiri
  [70.7299, 92.2041], // Mulut kanan
];

export function alignFace(source, landmarks, outputSize = 112) {
  if (!source || !landmarks || landmarks.length !== 5) {
    throw new Error("Source dan 5 landmarks wajib tersedia.");
  }

  const sourceWidth = source.videoWidth || source.naturalWidth || source.width;
  const sourceHeight = source.videoHeight || source.naturalHeight || source.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("Ukuran gambar atau video tidak valid.");
  }

  // Pastikan urutan landmarks:
  // mata kiri, mata kanan, hidung, mulut kiri, mulut kanan.
  const src = landmarks.map((point) => [point.x, point.y]);

  const dst = ARCFACE_LANDMARKS.map(([x, y]) => [
    x * (outputSize / 112),
    y * (outputSize / 112),
  ]);

  // Hitung titik tengah kedua kumpulan landmarks.
  const srcCenter = [0, 0];
  const dstCenter = [0, 0];

  for (let i = 0; i < 5; i++) {
    srcCenter[0] += src[i][0] / 5;
    srcCenter[1] += src[i][1] / 5;

    dstCenter[0] += dst[i][0] / 5;
    dstCenter[1] += dst[i][1] / 5;
  }

  // Hitung parameter rotasi dan skala.
  let numeratorA = 0;
  let numeratorB = 0;
  let denominator = 0;

  for (let i = 0; i < 5; i++) {
    const x = src[i][0] - srcCenter[0];
    const y = src[i][1] - srcCenter[1];

    const u = dst[i][0] - dstCenter[0];
    const v = dst[i][1] - dstCenter[1];

    numeratorA += x * u + y * v;
    numeratorB += x * v - y * u;
    denominator += x * x + y * y;
  }

  if (denominator < 1e-8) {
    throw new Error("Landmarks tidak valid untuk alignment.");
  }

  const a = numeratorA / denominator;
  const b = numeratorB / denominator;

  // Hitung translasi.
  const tx = dstCenter[0] - a * srcCenter[0] + b * srcCenter[1];
  const ty = dstCenter[1] - b * srcCenter[0] - a * srcCenter[1];

  // Buat canvas hasil alignment.
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, outputSize, outputSize);

  // Terapkan transformasi ke seluruh gambar sumber.
  ctx.setTransform(a, b, -b, a, tx, ty);
  ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight);

  // Kembalikan transformasi canvas ke kondisi awal.
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  return canvas;
}