import { z } from 'zod';
export declare const FormVisibilitySchema: z.ZodEnum<["public", "auth", "embed_only"]>;
export declare const FormStatusSchema: z.ZodEnum<["draft", "published", "archived"]>;
export declare const FormQuestionTypeSchema: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
export declare const FormQuestionOptionSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
}, "strip", z.ZodTypeAny, {
    label: string;
    id: string;
    color?: string | undefined;
    group?: "active" | "done" | "not_started" | "closed" | undefined;
}, {
    label: string;
    id: string;
    color?: string | undefined;
    group?: "active" | "done" | "not_started" | "closed" | undefined;
}>;
export declare const FormQuestionSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
    label: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodBoolean>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
        group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
        color?: string | undefined;
        group?: "active" | "done" | "not_started" | "closed" | undefined;
    }, {
        label: string;
        id: string;
        color?: string | undefined;
        group?: "active" | "done" | "not_started" | "closed" | undefined;
    }>, "many">>;
    contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    property_field_id: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodString;
    type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
    label: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodBoolean>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
        group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
        color?: string | undefined;
        group?: "active" | "done" | "not_started" | "closed" | undefined;
    }, {
        label: string;
        id: string;
        color?: string | undefined;
        group?: "active" | "done" | "not_started" | "closed" | undefined;
    }>, "many">>;
    contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    property_field_id: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodString;
    type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
    label: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    placeholder: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodBoolean>;
    hidden: z.ZodOptional<z.ZodBoolean>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
        group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
        color?: string | undefined;
        group?: "active" | "done" | "not_started" | "closed" | undefined;
    }, {
        label: string;
        id: string;
        color?: string | undefined;
        group?: "active" | "done" | "not_started" | "closed" | undefined;
    }>, "many">>;
    contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    property_field_id: z.ZodOptional<z.ZodString>;
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.ZodTypeAny, "passthrough">>;
export declare const FormSchemaPayload: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        hidden: z.ZodOptional<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
            group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }>, "many">>;
        contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        property_field_id: z.ZodOptional<z.ZodString>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        hidden: z.ZodOptional<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
            group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }>, "many">>;
        contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        property_field_id: z.ZodOptional<z.ZodString>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        hidden: z.ZodOptional<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
            group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }>, "many">>;
        contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        property_field_id: z.ZodOptional<z.ZodString>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        hidden: z.ZodOptional<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
            group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }>, "many">>;
        contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        property_field_id: z.ZodOptional<z.ZodString>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        hidden: z.ZodOptional<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
            group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }>, "many">>;
        contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        property_field_id: z.ZodOptional<z.ZodString>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        hidden: z.ZodOptional<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
            group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }>, "many">>;
        contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        property_field_id: z.ZodOptional<z.ZodString>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        hidden: z.ZodOptional<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
            group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }>, "many">>;
        contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        property_field_id: z.ZodOptional<z.ZodString>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        id: z.ZodString;
        type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        hidden: z.ZodOptional<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
            group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }>, "many">>;
        contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        property_field_id: z.ZodOptional<z.ZodString>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        id: z.ZodString;
        type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        placeholder: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodBoolean>;
        hidden: z.ZodOptional<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            color: z.ZodOptional<z.ZodString>;
            group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
        }, "strip", z.ZodTypeAny, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }, {
            label: string;
            id: string;
            color?: string | undefined;
            group?: "active" | "done" | "not_started" | "closed" | undefined;
        }>, "many">>;
        contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        property_field_id: z.ZodOptional<z.ZodString>;
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export declare const FormSettingsPayload: z.ZodDefault<z.ZodObject<{
    target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    button_label: z.ZodOptional<z.ZodString>;
    layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
    theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
    visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
    hide_branding: z.ZodOptional<z.ZodBoolean>;
    add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
    show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
    show_recaptcha: z.ZodOptional<z.ZodBoolean>;
    colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cover_focal_y: z.ZodOptional<z.ZodNumber>;
    icon: z.ZodOptional<z.ZodString>;
    icon_color: z.ZodOptional<z.ZodString>;
    icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
    assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    end_page_icon: z.ZodOptional<z.ZodString>;
    end_page_icon_color: z.ZodOptional<z.ZodString>;
    end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    end_page_title: z.ZodOptional<z.ZodString>;
    end_page_message: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    button_label: z.ZodOptional<z.ZodString>;
    layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
    theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
    visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
    hide_branding: z.ZodOptional<z.ZodBoolean>;
    add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
    show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
    show_recaptcha: z.ZodOptional<z.ZodBoolean>;
    colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cover_focal_y: z.ZodOptional<z.ZodNumber>;
    icon: z.ZodOptional<z.ZodString>;
    icon_color: z.ZodOptional<z.ZodString>;
    icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
    assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    end_page_icon: z.ZodOptional<z.ZodString>;
    end_page_icon_color: z.ZodOptional<z.ZodString>;
    end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    end_page_title: z.ZodOptional<z.ZodString>;
    end_page_message: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    button_label: z.ZodOptional<z.ZodString>;
    layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
    theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
    visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
    hide_branding: z.ZodOptional<z.ZodBoolean>;
    add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
    show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
    show_recaptcha: z.ZodOptional<z.ZodBoolean>;
    colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cover_focal_y: z.ZodOptional<z.ZodNumber>;
    icon: z.ZodOptional<z.ZodString>;
    icon_color: z.ZodOptional<z.ZodString>;
    icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
    assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    end_page_icon: z.ZodOptional<z.ZodString>;
    end_page_icon_color: z.ZodOptional<z.ZodString>;
    end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    end_page_title: z.ZodOptional<z.ZodString>;
    end_page_message: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>>;
export declare const CreateFormSchema: z.ZodObject<{
    name: z.ZodString;
    campaign_id: z.ZodString;
    space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
    schema: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough">>>;
    settings: z.ZodOptional<z.ZodDefault<z.ZodObject<{
        target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        button_label: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
        hide_branding: z.ZodOptional<z.ZodBoolean>;
        add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
        show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
        show_recaptcha: z.ZodOptional<z.ZodBoolean>;
        colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cover_focal_y: z.ZodOptional<z.ZodNumber>;
        icon: z.ZodOptional<z.ZodString>;
        icon_color: z.ZodOptional<z.ZodString>;
        icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
        assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_icon: z.ZodOptional<z.ZodString>;
        end_page_icon_color: z.ZodOptional<z.ZodString>;
        end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_title: z.ZodOptional<z.ZodString>;
        end_page_message: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        button_label: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
        hide_branding: z.ZodOptional<z.ZodBoolean>;
        add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
        show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
        show_recaptcha: z.ZodOptional<z.ZodBoolean>;
        colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cover_focal_y: z.ZodOptional<z.ZodNumber>;
        icon: z.ZodOptional<z.ZodString>;
        icon_color: z.ZodOptional<z.ZodString>;
        icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
        assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_icon: z.ZodOptional<z.ZodString>;
        end_page_icon_color: z.ZodOptional<z.ZodString>;
        end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_title: z.ZodOptional<z.ZodString>;
        end_page_message: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        button_label: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
        hide_branding: z.ZodOptional<z.ZodBoolean>;
        add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
        show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
        show_recaptcha: z.ZodOptional<z.ZodBoolean>;
        colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cover_focal_y: z.ZodOptional<z.ZodNumber>;
        icon: z.ZodOptional<z.ZodString>;
        icon_color: z.ZodOptional<z.ZodString>;
        icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
        assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_icon: z.ZodOptional<z.ZodString>;
        end_page_icon_color: z.ZodOptional<z.ZodString>;
        end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_title: z.ZodOptional<z.ZodString>;
        end_page_message: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    campaign_id: string;
    space_id?: string | null | undefined;
    visibility?: "public" | "auth" | "embed_only" | undefined;
    schema?: z.objectOutputType<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    settings?: z.objectOutputType<{
        target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        button_label: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
        hide_branding: z.ZodOptional<z.ZodBoolean>;
        add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
        show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
        show_recaptcha: z.ZodOptional<z.ZodBoolean>;
        colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cover_focal_y: z.ZodOptional<z.ZodNumber>;
        icon: z.ZodOptional<z.ZodString>;
        icon_color: z.ZodOptional<z.ZodString>;
        icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
        assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_icon: z.ZodOptional<z.ZodString>;
        end_page_icon_color: z.ZodOptional<z.ZodString>;
        end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_title: z.ZodOptional<z.ZodString>;
        end_page_message: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}, {
    name: string;
    campaign_id: string;
    space_id?: string | null | undefined;
    visibility?: "public" | "auth" | "embed_only" | undefined;
    schema?: z.objectInputType<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    settings?: z.objectInputType<{
        target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        button_label: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
        hide_branding: z.ZodOptional<z.ZodBoolean>;
        add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
        show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
        show_recaptcha: z.ZodOptional<z.ZodBoolean>;
        colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cover_focal_y: z.ZodOptional<z.ZodNumber>;
        icon: z.ZodOptional<z.ZodString>;
        icon_color: z.ZodOptional<z.ZodString>;
        icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
        assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_icon: z.ZodOptional<z.ZodString>;
        end_page_icon_color: z.ZodOptional<z.ZodString>;
        end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_title: z.ZodOptional<z.ZodString>;
        end_page_message: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}>;
export type CreateFormDto = z.infer<typeof CreateFormSchema>;
export declare const UpdateFormSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
    schema: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough">>>;
    settings: z.ZodOptional<z.ZodDefault<z.ZodObject<{
        target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        button_label: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
        hide_branding: z.ZodOptional<z.ZodBoolean>;
        add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
        show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
        show_recaptcha: z.ZodOptional<z.ZodBoolean>;
        colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cover_focal_y: z.ZodOptional<z.ZodNumber>;
        icon: z.ZodOptional<z.ZodString>;
        icon_color: z.ZodOptional<z.ZodString>;
        icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
        assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_icon: z.ZodOptional<z.ZodString>;
        end_page_icon_color: z.ZodOptional<z.ZodString>;
        end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_title: z.ZodOptional<z.ZodString>;
        end_page_message: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        button_label: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
        hide_branding: z.ZodOptional<z.ZodBoolean>;
        add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
        show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
        show_recaptcha: z.ZodOptional<z.ZodBoolean>;
        colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cover_focal_y: z.ZodOptional<z.ZodNumber>;
        icon: z.ZodOptional<z.ZodString>;
        icon_color: z.ZodOptional<z.ZodString>;
        icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
        assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_icon: z.ZodOptional<z.ZodString>;
        end_page_icon_color: z.ZodOptional<z.ZodString>;
        end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_title: z.ZodOptional<z.ZodString>;
        end_page_message: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        button_label: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
        hide_branding: z.ZodOptional<z.ZodBoolean>;
        add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
        show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
        show_recaptcha: z.ZodOptional<z.ZodBoolean>;
        colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cover_focal_y: z.ZodOptional<z.ZodNumber>;
        icon: z.ZodOptional<z.ZodString>;
        icon_color: z.ZodOptional<z.ZodString>;
        icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
        assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_icon: z.ZodOptional<z.ZodString>;
        end_page_icon_color: z.ZodOptional<z.ZodString>;
        end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_title: z.ZodOptional<z.ZodString>;
        end_page_message: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    space_id?: string | null | undefined;
    visibility?: "public" | "auth" | "embed_only" | undefined;
    schema?: z.objectOutputType<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    settings?: z.objectOutputType<{
        target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        button_label: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
        hide_branding: z.ZodOptional<z.ZodBoolean>;
        add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
        show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
        show_recaptcha: z.ZodOptional<z.ZodBoolean>;
        colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cover_focal_y: z.ZodOptional<z.ZodNumber>;
        icon: z.ZodOptional<z.ZodString>;
        icon_color: z.ZodOptional<z.ZodString>;
        icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
        assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_icon: z.ZodOptional<z.ZodString>;
        end_page_icon_color: z.ZodOptional<z.ZodString>;
        end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_title: z.ZodOptional<z.ZodString>;
        end_page_message: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}, {
    name?: string | undefined;
    space_id?: string | null | undefined;
    visibility?: "public" | "auth" | "embed_only" | undefined;
    schema?: z.objectInputType<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    settings?: z.objectInputType<{
        target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        button_label: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
        hide_branding: z.ZodOptional<z.ZodBoolean>;
        add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
        show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
        show_recaptcha: z.ZodOptional<z.ZodBoolean>;
        colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cover_focal_y: z.ZodOptional<z.ZodNumber>;
        icon: z.ZodOptional<z.ZodString>;
        icon_color: z.ZodOptional<z.ZodString>;
        icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
        assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_icon: z.ZodOptional<z.ZodString>;
        end_page_icon_color: z.ZodOptional<z.ZodString>;
        end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_title: z.ZodOptional<z.ZodString>;
        end_page_message: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}>, {
    name?: string | undefined;
    space_id?: string | null | undefined;
    visibility?: "public" | "auth" | "embed_only" | undefined;
    schema?: z.objectOutputType<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    settings?: z.objectOutputType<{
        target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        button_label: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
        hide_branding: z.ZodOptional<z.ZodBoolean>;
        add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
        show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
        show_recaptcha: z.ZodOptional<z.ZodBoolean>;
        colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cover_focal_y: z.ZodOptional<z.ZodNumber>;
        icon: z.ZodOptional<z.ZodString>;
        icon_color: z.ZodOptional<z.ZodString>;
        icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
        assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_icon: z.ZodOptional<z.ZodString>;
        end_page_icon_color: z.ZodOptional<z.ZodString>;
        end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_title: z.ZodOptional<z.ZodString>;
        end_page_message: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}, {
    name?: string | undefined;
    space_id?: string | null | undefined;
    visibility?: "public" | "auth" | "embed_only" | undefined;
    schema?: z.objectInputType<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            id: z.ZodString;
            type: z.ZodEnum<["short_text", "long_text", "dates", "single_select", "multi_select", "checkbox", "contact", "people", "uploads", "number", "signature", "task_property", "info_block"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            hidden: z.ZodOptional<z.ZodBoolean>;
            options: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                label: z.ZodString;
                color: z.ZodOptional<z.ZodString>;
                group: z.ZodOptional<z.ZodEnum<["not_started", "active", "done", "closed"]>>;
            }, "strip", z.ZodTypeAny, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }, {
                label: string;
                id: string;
                color?: string | undefined;
                group?: "active" | "done" | "not_started" | "closed" | undefined;
            }>, "many">>;
            contact_subfields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            property_field_id: z.ZodOptional<z.ZodString>;
            config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    settings?: z.objectInputType<{
        target_space_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        redirect_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        button_label: z.ZodOptional<z.ZodString>;
        layout: z.ZodOptional<z.ZodEnum<["one_column", "two_column"]>>;
        theme: z.ZodOptional<z.ZodEnum<["light", "dark"]>>;
        visibility: z.ZodOptional<z.ZodEnum<["public", "auth", "embed_only"]>>;
        hide_branding: z.ZodOptional<z.ZodBoolean>;
        add_answers_to_description: z.ZodOptional<z.ZodBoolean>;
        show_resubmit_button: z.ZodOptional<z.ZodBoolean>;
        show_recaptcha: z.ZodOptional<z.ZodBoolean>;
        colors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        cover_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cover_focal_y: z.ZodOptional<z.ZodNumber>;
        icon: z.ZodOptional<z.ZodString>;
        icon_color: z.ZodOptional<z.ZodString>;
        icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        responses_view_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        assignee_type: z.ZodOptional<z.ZodEnum<["human", "agent", "unassigned"]>>;
        assignee_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        task_title_question_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_icon: z.ZodOptional<z.ZodString>;
        end_page_icon_color: z.ZodOptional<z.ZodString>;
        end_page_icon_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        end_page_title: z.ZodOptional<z.ZodString>;
        end_page_message: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}>;
export type UpdateFormDto = z.infer<typeof UpdateFormSchema>;
export declare const FormIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type FormIdParam = z.infer<typeof FormIdParamSchema>;
export declare const PublicFormTokenParamSchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type PublicFormTokenParam = z.infer<typeof PublicFormTokenParamSchema>;
export declare const SubmitFormSchema: z.ZodObject<{
    answers: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    turnstile_token: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    answers: Record<string, unknown>;
    turnstile_token?: string | undefined;
}, {
    answers: Record<string, unknown>;
    turnstile_token?: string | undefined;
}>;
export type SubmitFormDto = z.infer<typeof SubmitFormSchema>;
