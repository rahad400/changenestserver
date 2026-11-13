const categories = new Set([
  "environment",
  "healthcare",
  "education",
  "charity",
  "community-service",
  "disaster-relief",
  "animal-welfare",
  "social-awareness",
]);

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 2 * 1024 * 1024;
const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeImage = (image) => {
  if (image === undefined || image === null) return null;
  if (!isRecord(image)) return undefined;

  if (Object.keys(image).length === 1 && typeof image.url === "string") {
    const urlValue = image.url.trim();

    if (!urlValue || urlValue.length > 2048) return undefined;

    try {
      const url = new URL(urlValue);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
      ) {
        return undefined;
      }

      return { url: urlValue };
    } catch {
      return undefined;
    }
  }

  if (
    Object.keys(image).length !== 2 ||
    typeof image.dataUrl !== "string" ||
    typeof image.fileName !== "string" ||
    !image.fileName.trim() ||
    image.fileName.length > 255
  ) {
    return undefined;
  }

  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(
      image.dataUrl,
    );

  if (!match || !imageMimeTypes.has(match[1].toLowerCase())) {
    return undefined;
  }

  const bytes = Buffer.from(match[2], "base64");
  if (
    bytes.length === 0 ||
    bytes.length > maxImageSize ||
    bytes.toString("base64") !== match[2]
  ) {
    return undefined;
  }

  return { dataUrl: image.dataUrl, fileName: image.fileName.trim() };
};

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return false;
  }

  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(
    parts.map(({ type, value: partValue }) => [type, partValue]),
  );
  const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;

  return value >= today;
};

export const normalizeEventPayload = (input) => {
  if (!isRecord(input) || !isRecord(input.values)) return null;

  const { values } = input;
  const textFields = [
    "title",
    "categoryId",
    "description",
    "date",
    "startTime",
    "endTime",
    "city",
    "venue",
  ];

  if (!textFields.every((field) => typeof values[field] === "string")) {
    return null;
  }

  const title = values.title.trim();
  const categoryId = values.categoryId;
  const description = values.description.trim();
  const date = values.date;
  const startTime = values.startTime;
  const endTime = values.endTime;
  const city = values.city.trim();
  const venue = values.venue.trim();
  const capacity =
    typeof values.capacity === "string" ||
    (typeof values.capacity === "number" &&
      Number.isInteger(values.capacity))
      ? String(values.capacity).trim()
      : "";
  const capacityNumber = Number(capacity);

  if (
    title.length < 5 ||
    title.length > 120 ||
    !categories.has(categoryId) ||
    description.length < 30 ||
    description.length > 2000 ||
    !isValidDate(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) ||
    endTime <= startTime ||
    city.length < 2 ||
    city.length > 80 ||
    venue.length < 3 ||
    venue.length > 160 ||
    !Number.isInteger(capacityNumber) ||
    capacityNumber < 1 ||
    capacityNumber > 5000 ||
    values.guidelines !== true
  ) {
    return null;
  }

  const image = normalizeImage(input.image);
  if (image === undefined) return null;

  return {
    values: {
      title,
      categoryId,
      description,
      date,
      startTime,
      endTime,
      city,
      venue,
      capacity,
      guidelines: true,
    },
    image,
  };
};
