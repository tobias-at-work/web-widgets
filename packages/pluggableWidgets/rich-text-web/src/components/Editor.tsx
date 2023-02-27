import { debounce } from "@mendix/pluggable-widgets-commons";
import {
    CKEditorEventAction,
    CKEditorEventPayload,
    CKEditorHookProps,
    CKEditorInstance,
    CKEditorNamespace
} from "ckeditor4-react";
import { Component, createElement } from "react";
import { RichTextContainerProps } from "../../typings/RichTextProps";
import { getCKEditorConfig } from "../utils/ckeditorConfigs";
import { MainEditor } from "./MainEditor";
import DOMPurify from "dompurify";
import { ValueStatus } from "mendix";

const FILE_SIZE_LIMIT = 1048576; // Binary bytes for 1MB

interface EditorProps {
    element: HTMLElement;
    widgetProps: RichTextContainerProps;
}

type EditorHookProps = CKEditorHookProps<never>;

interface CKEditorEvent {
    data: any;
    listenerData: any;
    name: string;
    sender: { [key: string]: any };

    cancel(): void;
    removeListener(): void;
    stop(): void;
}

class ContentTemplate {
    title: String;
    image: String;
    description: String;
    html: String;

    constructor(title: String, image: String, description: String, html: String) {
        this.title = title;
        this.image = image;
        this.description = description;
        this.html = html;
    }
}

export class Editor extends Component<EditorProps> {
    widgetProps: RichTextContainerProps;
    editor: CKEditorInstance | null;
    editorHookProps: EditorHookProps;
    editorKey: number;
    editorScript = "widgets/ckeditor/ckeditor.js";
    element: HTMLElement;
    namespace: CKEditorNamespace;
    lastSentValue: string | undefined;

    constructor(props: EditorProps) {
        super(props);

        // Props are read only, so, make a copy;
        console.info("Constructing new editor");
        this.widgetProps = { ...this.props.widgetProps };
        this.element = this.props.element;
        this.editorKey = this.getNewKey();
        this.editorHookProps = this.getNewEditorHookProps(true);
        this.onChange = debounce(this.onChange.bind(this), 500);
        this.onKeyPress = this.onKeyPress.bind(this);
        this.onPasteContent = this.onPasteContent.bind(this);
        this.onDropContent = this.onDropContent.bind(this);
        console.info("New editor constructed");
    }

    setNewRenderProps(updatePlugins: boolean): void {
        console.info("Setting new render props");
        this.widgetProps = { ...this.props.widgetProps };
        if (updatePlugins) {
            this.element = this.props.element;
        }
        this.editorKey = this.getNewKey();
        this.editorHookProps = this.getNewEditorHookProps(updatePlugins || true);
    }

    getRenderProps(): [number, EditorHookProps] {
        if (this.shouldRebuildEditor()) {
            this.setNewRenderProps(true);
        } else if (this.shouldUpdateEditor()) {
            this.setNewRenderProps(false);
        }
        return [this.editorKey, this.editorHookProps];
    }

    shouldRebuildEditor(): boolean {
        if (this.element !== this.props.element) {
            console.info("Element has changed.");
            return true;
        } else {
            return false;
        }
    }

    shouldUpdateEditor(): boolean {
        const keys = Object.keys(this.widgetProps) as Array<keyof RichTextContainerProps>;
        const prevProps = this.widgetProps;
        const nextProps = this.props.widgetProps;
        return keys.some(key => {
            // We skip stringAttribute as it always changes. And we
            // handle updates in componentDidUpdate method.
            if (key === "stringAttribute") {
                return false;
            }
            if (prevProps[key] !== nextProps[key]) {
                console.info("Property " + key + " has changed.");
                return true;
            } else {
                return false;
            }
        });
    }

    getNewKey(): number {
        return Date.now();
    }

    getEditorUrl(): string {
        return new URL(this.editorScript, window.mx.remoteUrl).toString();
    }

    getNewEditorHookProps(updatePlugins: boolean): EditorHookProps {
        console.info("Getting new EditorHookProps");
        const onInstanceReady = this.onInstanceReady.bind(this);
        const onPluginsLoaded = this.onPluginsLoaded.bind(this);
        const onDestroy = this.onDestroy.bind(this);
        const config = getCKEditorConfig(this.widgetProps, updatePlugins);

        return {
            element: this.props.element,
            editorUrl: this.getEditorUrl(),
            type: this.widgetProps.editorType,
            dispatchEvent: ({ type, payload }) => {
                if (type === CKEditorEventAction.beforeLoad) {
                    console.info("Before load invoked for editor " + this.widgetProps.name);
                    this.namespace = payload;
                    console.info("Namespace stored in editor " + this.widgetProps.name);
                }
            },
            // Here we ignore hook API and instead use
            // editor instance to subscribe to events.
            config: Object.assign(config, {
                on: {
                    instanceReady(this: CKEditorInstance) {
                        onInstanceReady(this);
                    },
                    pluginsLoaded: onPluginsLoaded,
                    destroy: onDestroy
                }
            })
        };
    }

    onInstanceReady(editor: CKEditorInstance): void {
        this.editor = editor;
        console.info("Instance ready for editor " + this.widgetProps.name);
        this.updateEditorState({
            data: this.widgetProps.stringAttribute.value
        });
    }

    onPluginsLoaded(): void {
        console.info("Plugins loaded for editor " + this.widgetProps.name);
        const datasource = this.widgetProps.templateDatasource;
        if (datasource === undefined) {
            console.warn("Templates datasource not set for editor " + this.widgetProps.name);
        } else if (datasource.status === ValueStatus.Available) {
            console.info("Templates are available for editor " + this.widgetProps.name);
            const contentTemplates: ContentTemplate[] = [];
            const mxObjects = datasource.items;
            if (mxObjects) {
                console.info("MxObjects exist");
                mxObjects.map(mxObject => {
                    const contentTemplate: ContentTemplate = new ContentTemplate(
                        this.widgetProps.templateTitleAttribute.get(mxObject).value || "<title>",
                        this.widgetProps.templateImageAttribute.get(mxObject).value || "<description>",
                        this.widgetProps.templateDescriptionAttribute.get(mxObject).value || "",
                        this.widgetProps.templateHtmlAttribute.get(mxObject).value || "[html]"
                    );
                    contentTemplates.push(contentTemplate);
                    console.info("Found " + JSON.stringify(contentTemplate));
                });
            } else {
                console.info("MxObjects are empty for editor " + this.widgetProps.name);
            }
            var CKEDITOR: CKEditorNamespace = this.namespace;
            CKEDITOR.addTemplates(this.widgetProps.templates, {
                imagesPath: window.location.origin + "/img/",
                templates: contentTemplates
            });
            console.info("Templates added for editor " + this.widgetProps.name);
        } else if (datasource.status === ValueStatus.Loading) {
            console.warn("Templates are still loading for editor " + this.widgetProps.name);
        } else if (datasource.status === ValueStatus.Unavailable) {
            console.warn("Templates are not available for editor " + this.widgetProps.name);
        } else {
            console.error("Template status unknown for editor " + this.widgetProps.name);
        }
    }

    onDestroy(): void {
        this.editor = null;
    }

    onKeyPress(): void {
        this.widgetProps.onKeyPress?.execute();
    }

    onPasteContent(event: CKEditorEvent): void {
        if (event.data.dataTransfer.isFileTransfer()) {
            for (let i = 0; i < event.data.dataTransfer.getFilesCount(); i++) {
                if (event.data.dataTransfer.getFile(i).size > FILE_SIZE_LIMIT) {
                    this.editor.showNotification(
                        `The image ${
                            event.data.dataTransfer.getFile(i).name
                        } is larger than the 1MB limit. Please choose a smaller image and try again.`,
                        "warning"
                    );
                    event.cancel();
                    break;
                }
            }
        }
    }
    onDropContent(event: CKEditorEvent): void {
        if (event.data.dataTransfer.isFileTransfer()) {
            for (let i = 0; i < event.data.dataTransfer.getFilesCount(); i++) {
                if (event.data.dataTransfer.getFile(i).size > FILE_SIZE_LIMIT) {
                    this.editor.showNotification(
                        `The image ${
                            event.data.dataTransfer.getFile(i).name
                        } is larger than the 1MB limit. Please choose a smaller image and try again.`,
                        "warning"
                    );
                    event.cancel();
                    break;
                }
            }
        }
    }

    // onChange is wrapped in debounce, so, we always need to check
    // weather we sill have editor.
    onChange(_event: CKEditorEventPayload<"change">): void {
        if (this.editor) {
            const editorData = this.editor.getData();
            const content = this.widgetProps.sanitizeContent ? DOMPurify.sanitize(editorData) : editorData;
            this.lastSentValue = content;
            this.widgetProps.stringAttribute.setValue(content);
        }

        this.widgetProps.onChange?.execute();
    }

    addListeners(): void {
        if (this.editor && !this.editor.readOnly) {
            this.editor.on("change", this.onChange);
            this.editor.on("key", this.onKeyPress);
            this.editor.on("paste", this.onPasteContent);
            this.editor.on("drop", this.onDropContent);
        }
    }

    removeListeners(): void {
        this.editor?.removeListener("change", this.onChange);
        this.editor?.removeListener("key", this.onKeyPress);
        this.editor?.removeListener("paste", this.onPasteContent);
        this.editor?.removeListener("drop", this.onDropContent);
    }

    updateEditorState(
        args: { data: string | undefined; readOnly: boolean } | { data: string | undefined } | { readOnly: boolean }
    ): void {
        console.info("Updating editor state");
        this.removeListeners();

        if ("readOnly" in args) {
            this.editor.setReadOnly(args.readOnly);
        }

        // The trick is that when setting new data,
        // we need to await till data become "ready" and
        // only then attach listeners. Otherwise onChange will
        // be called whenever we call setData, which is not what we want.
        // So, to solve this, we pass callback, which is called
        // when data is "read".
        // If we just update readOnly state, then we can
        // call addListeners immediately.
        // https://ckeditor.com/docs/ckeditor4/latest/api/CKEDITOR_editor.html#method-setData
        if ("data" in args) {
            this.editor?.setData(args.data, () => this.addListeners());
        } else {
            this.addListeners();
        }
        console.info("Editor state updated");
    }

    updateEditor(
        prevAttr: RichTextContainerProps["stringAttribute"],
        nextAttr: RichTextContainerProps["stringAttribute"]
    ): void {
        console.info("Updating editor");
        if (this.editor) {
            const shouldUpdateData = nextAttr.value !== prevAttr.value && nextAttr.value !== this.lastSentValue;

            const shouldUpdateReadOnly = this.editor.readOnly !== nextAttr.readOnly;

            if (shouldUpdateData && shouldUpdateReadOnly) {
                this.updateEditorState({
                    data: nextAttr.value,
                    readOnly: nextAttr.readOnly
                });
            } else if (shouldUpdateData) {
                this.updateEditorState({
                    data: nextAttr.value
                });
            } else if (shouldUpdateReadOnly) {
                this.updateEditorState({
                    readOnly: nextAttr.readOnly
                });
            }
        }

        this.lastSentValue = undefined;
        console.info("Editor updated");
    }

    componentDidUpdate(): void {
        console.info("Update component");
        const prevAttr = this.widgetProps.stringAttribute;
        const nextAttr = this.props.widgetProps.stringAttribute;

        if (prevAttr !== nextAttr) {
            this.widgetProps.stringAttribute = nextAttr;
            this.updateEditor(prevAttr, nextAttr);
        }
        console.info("Component updated");
    }

    render(): JSX.Element | null {
        const [key, config] = this.getRenderProps();

        return <MainEditor key={key} config={config} />;
    }
}
