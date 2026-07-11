"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferAssetRefType = inferAssetRefType;
exports.buildVibeyAssetRef = buildVibeyAssetRef;
exports.buildStorageAssetRef = buildStorageAssetRef;
exports.buildExternalAssetRef = buildExternalAssetRef;
const ASSET_REF_TYPES = new Set(['image', 'document', 'video', 'audio', 'other']);
function stringOrNull(value) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed.length > 0 ? trimmed : null;
}
function stringOrFallback(value, fallback) {
    return stringOrNull(value) ?? fallback;
}
function numberOrZero(value) {
    return Number.isFinite(value) ? Number(value) : 0;
}
function numberOrNull(value) {
    return Number.isFinite(value) ? Number(value) : null;
}
function inferAssetRefType(mimeType, fallback) {
    const normalized = stringOrNull(fallback);
    if (normalized && ASSET_REF_TYPES.has(normalized)) {
        return normalized;
    }
    const mime = stringOrNull(mimeType)?.toLowerCase() ?? '';
    if (mime.startsWith('image/'))
        return 'image';
    if (mime.startsWith('video/'))
        return 'video';
    if (mime.startsWith('audio/'))
        return 'audio';
    if (mime === 'application/pdf' ||
        mime.includes('document') ||
        mime.includes('spreadsheet') ||
        mime.includes('presentation') ||
        mime.startsWith('text/')) {
        return 'document';
    }
    return 'other';
}
function buildVibeyAssetRef(asset, urlOverride) {
    const originalFilename = stringOrFallback(asset.original_filename, asset.name ?? 'upload');
    return {
        kind: 'vibey_asset',
        asset_id: asset.id,
        bucket_name: asset.bucket_name,
        file_path: asset.file_path,
        url: stringOrNull(urlOverride) ?? stringOrNull(asset.public_url),
        mime_type: stringOrFallback(asset.mime_type, 'application/octet-stream'),
        asset_type: inferAssetRefType(asset.mime_type, asset.asset_type),
        name: stringOrFallback(asset.name, originalFilename),
        original_filename: originalFilename,
        file_size: numberOrZero(asset.file_size),
        campaign_id: stringOrNull(asset.campaign_id),
        space_id: stringOrNull(asset.space_id),
        org_id: stringOrNull(asset.org_id),
        source: stringOrNull(asset.source),
        source_surface: stringOrNull(asset.source_surface),
    };
}
function buildStorageAssetRef(input) {
    const originalFilename = stringOrFallback(input.original_filename, input.name ?? 'upload');
    return {
        kind: 'storage_asset',
        bucket_name: input.bucket_name,
        file_path: input.file_path,
        url: stringOrNull(input.url),
        mime_type: stringOrFallback(input.mime_type, 'application/octet-stream'),
        asset_type: inferAssetRefType(input.mime_type, input.asset_type),
        name: stringOrFallback(input.name, originalFilename),
        original_filename: originalFilename,
        file_size: numberOrZero(input.file_size),
        user_id: stringOrNull(input.user_id),
        org_id: stringOrNull(input.org_id),
        source: stringOrNull(input.source),
        source_surface: stringOrNull(input.source_surface),
        ...(input.metadata ? { metadata: input.metadata } : {}),
    };
}
function buildExternalAssetRef(input) {
    const originalFilename = stringOrFallback(input.original_filename, input.name ?? 'upload');
    return {
        kind: 'external_asset',
        provider: input.provider,
        external_id: stringOrNull(input.external_id),
        file_path: stringOrNull(input.file_path),
        url: stringOrNull(input.url),
        mime_type: stringOrFallback(input.mime_type, 'application/octet-stream'),
        asset_type: inferAssetRefType(input.mime_type, input.asset_type),
        name: stringOrFallback(input.name, originalFilename),
        original_filename: originalFilename,
        file_size: numberOrNull(input.file_size),
        org_id: stringOrNull(input.org_id),
        source: stringOrNull(input.source),
        source_surface: stringOrNull(input.source_surface),
        ...(input.metadata ? { metadata: input.metadata } : {}),
    };
}
//# sourceMappingURL=asset-ref.js.map