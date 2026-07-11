"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitFormSchema = exports.PublicFormTokenParamSchema = exports.FormIdParamSchema = exports.UpdateFormSchema = exports.CreateFormSchema = exports.FormSettingsPayload = exports.FormSchemaPayload = exports.FormQuestionSchema = exports.FormQuestionOptionSchema = exports.FormQuestionTypeSchema = exports.FormStatusSchema = exports.FormVisibilitySchema = void 0;
const zod_1 = require("zod");
exports.FormVisibilitySchema = zod_1.z.enum(['public', 'auth', 'embed_only']);
exports.FormStatusSchema = zod_1.z.enum(['draft', 'published', 'archived']);
exports.FormQuestionTypeSchema = zod_1.z.enum([
    'short_text',
    'long_text',
    'dates',
    'single_select',
    'multi_select',
    'checkbox',
    'contact',
    'people',
    'uploads',
    'number',
    'signature',
    'task_property',
    'info_block',
]);
exports.FormQuestionOptionSchema = zod_1.z.object({
    id: zod_1.z.string().min(1).max(200),
    label: zod_1.z.string().min(1).max(200),
    color: zod_1.z.string().max(200).optional(),
    group: zod_1.z.enum(['not_started', 'active', 'done', 'closed']).optional(),
});
exports.FormQuestionSchema = zod_1.z
    .object({
    id: zod_1.z.string().min(1).max(200),
    type: exports.FormQuestionTypeSchema,
    label: zod_1.z.string().max(500),
    description: zod_1.z.string().max(2000).optional(),
    placeholder: zod_1.z.string().max(500).optional(),
    required: zod_1.z.boolean().optional(),
    hidden: zod_1.z.boolean().optional(),
    options: zod_1.z.array(exports.FormQuestionOptionSchema).optional(),
    contact_subfields: zod_1.z.array(zod_1.z.string().min(1).max(100)).max(20).optional(),
    property_field_id: zod_1.z.string().max(200).optional(),
    config: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
})
    .passthrough();
exports.FormSchemaPayload = zod_1.z
    .object({
    title: zod_1.z.string().max(500).optional(),
    description: zod_1.z.string().max(2000).optional(),
    questions: zod_1.z.array(exports.FormQuestionSchema).max(100).default([]),
})
    .passthrough();
exports.FormSettingsPayload = zod_1.z
    .object({
    target_space_id: zod_1.z.string().uuid().nullable().optional(),
    redirect_url: zod_1.z.string().max(2048).nullable().optional(),
    button_label: zod_1.z.string().max(200).optional(),
    layout: zod_1.z.enum(['one_column', 'two_column']).optional(),
    theme: zod_1.z.enum(['light', 'dark']).optional(),
    visibility: exports.FormVisibilitySchema.optional(),
    hide_branding: zod_1.z.boolean().optional(),
    add_answers_to_description: zod_1.z.boolean().optional(),
    show_resubmit_button: zod_1.z.boolean().optional(),
    show_recaptcha: zod_1.z.boolean().optional(),
    colors: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    cover_url: zod_1.z.string().max(2048).nullable().optional(),
    cover_focal_y: zod_1.z.number().min(0).max(100).optional(),
    icon: zod_1.z.string().max(100).optional(),
    icon_color: zod_1.z.string().max(100).optional(),
    icon_image_url: zod_1.z.string().max(2048).nullable().optional(),
    responses_view_id: zod_1.z.string().max(200).nullable().optional(),
    assignee_type: zod_1.z.enum(['human', 'agent', 'unassigned']).optional(),
    assignee_id: zod_1.z.string().max(200).nullable().optional(),
    task_title_question_id: zod_1.z.string().max(200).nullable().optional(),
    end_page_icon: zod_1.z.string().max(100).optional(),
    end_page_icon_color: zod_1.z.string().max(100).optional(),
    end_page_icon_image_url: zod_1.z.string().max(2048).nullable().optional(),
    end_page_title: zod_1.z.string().max(500).optional(),
    end_page_message: zod_1.z.string().max(2000).optional(),
})
    .passthrough()
    .default({});
exports.CreateFormSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(500),
    campaign_id: zod_1.z.string().uuid(),
    space_id: zod_1.z.string().uuid().nullable().optional(),
    visibility: exports.FormVisibilitySchema.optional(),
    schema: exports.FormSchemaPayload.optional(),
    settings: exports.FormSettingsPayload.optional(),
});
exports.UpdateFormSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(500).optional(),
    space_id: zod_1.z.string().uuid().nullable().optional(),
    visibility: exports.FormVisibilitySchema.optional(),
    schema: exports.FormSchemaPayload.optional(),
    settings: exports.FormSettingsPayload.optional(),
})
    .refine((value) => value.name !== undefined ||
    value.space_id !== undefined ||
    value.visibility !== undefined ||
    value.schema !== undefined ||
    value.settings !== undefined, { message: 'At least one update field is required' });
exports.FormIdParamSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
exports.PublicFormTokenParamSchema = zod_1.z.object({ token: zod_1.z.string().min(8).max(200) });
exports.SubmitFormSchema = zod_1.z.object({
    answers: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    turnstile_token: zod_1.z.string().min(1).max(2048).optional(),
});
//# sourceMappingURL=forms.js.map