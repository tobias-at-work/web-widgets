import { StructurePreviewProps } from "@mendix/widget-plugin-platform/preview/structure-preview-api";
import { Properties, hidePropertiesIn, transformGroupsIntoTabs, hidePropertyIn } from "@mendix/pluggable-widgets-tools";

import { RichTextPreviewProps } from "../typings/RichTextProps";
import RichTextPreviewSVGDark from "./assets/rich-text-preview-dark.svg";
import RichTextPreviewSVGLight from "./assets/rich-text-preview-light.svg";

const advancedModeItems: Array<keyof RichTextPreviewProps> = [
    "enterMode",
    "shiftEnterMode",
    "spellChecker",
    "codeHighlight",
    "advancedContentFilter",
    "allowedContent",
    "disallowedContent"
];
const toolbarGroups: Array<keyof RichTextPreviewProps> = [
    "toolsGroup",
    "separatorGroup",
    "stylesGroup",
    "basicStylesGroup",
    "clipboardGroup",
    "colorsGroup",
    "documentGroup",
    "editingGroup",
    "formsGroup",
    "linksGroup",
    "insertGroup",
    "paragraphGroup",
    "othersGroup",
    "separator2Group"
];

export function getProperties(
    values: RichTextPreviewProps,
    defaultProperties: Properties,
    platform: "web" | "desktop"
): Properties {
    if (values.preset === "custom") {
        if (values.toolbarConfig === "basic") {
            hidePropertiesIn(defaultProperties, values, [
                "advancedConfig",
                "templates",
                "templateDatasource",
                "templateTitleAttribute",
                "templateDescriptionAttribute",
                "templateHtmlAttribute"
            ]);
        }
        if (values.toolbarConfig === "advanced") {
            hidePropertiesIn(defaultProperties, values, toolbarGroups);
            if (values.advancedConfig.filter(e => e.ctItemType === "Templates").length < 1) {
                hidePropertiesIn(defaultProperties, values, [
                    "templates",
                    "templateDatasource",
                    "templateTitleAttribute",
                    "templateDescriptionAttribute",
                    "templateHtmlAttribute"
                ]);
            } else if (values.templates === "default") {
                hidePropertiesIn(defaultProperties, values, [
                    "templateDatasource",
                    "templateTitleAttribute",
                    "templateDescriptionAttribute",
                    "templateHtmlAttribute"
                ]);
            }
        }
    } else {
        hidePropertiesIn(defaultProperties, values, toolbarGroups.concat(["toolbarConfig", "advancedConfig"]));
        if (values.preset === "basic" || values.preset === "standard") {
            hidePropertiesIn(defaultProperties, values, [
                "templates",
                "templateDatasource",
                "templateTitleAttribute",
                "templateDescriptionAttribute",
                "templateHtmlAttribute"
            ]);
        } else if (values.templates === "default") {
            hidePropertiesIn(defaultProperties, values, [
                "templateDatasource",
                "templateTitleAttribute",
                "templateDescriptionAttribute",
                "templateHtmlAttribute"
            ]);
        }
    }
    if (values.advancedContentFilter === "auto") {
        hidePropertiesIn(defaultProperties, values, ["allowedContent", "disallowedContent"]);
    }
    if (platform === "web") {
        transformGroupsIntoTabs(defaultProperties);
        if (!values.advancedMode) {
            hidePropertiesIn(defaultProperties, values, advancedModeItems);
        }
    } else {
        hidePropertyIn(defaultProperties, values, "advancedMode");
    }
    if (values.styleSetName === undefined) {
        hidePropertiesIn(defaultProperties, values, ["stylesConfig", "validSelectors", "skipSelectors"]);
    }
    return defaultProperties;
}

export function getPreview(props: RichTextPreviewProps, isDarkMode: boolean): StructurePreviewProps {
    const variant = isDarkMode ? RichTextPreviewSVGDark : RichTextPreviewSVGLight;
    const doc = decodeURIComponent(variant.replace("data:image/svg+xml,", ""));

    return {
        type: "Image",
        document: props.stringAttribute ? doc.replace("[No attribute selected]", `[${props.stringAttribute}]`) : doc,
        height: 148
    };
}

export function getCustomCaption(values: RichTextPreviewProps, _platform = "desktop"): string {
    return values.stringAttribute || "Rich Text";
}
