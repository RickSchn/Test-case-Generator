// ============================================================

const emptyModelData = {
    detections: [],
    states: []
};


// Fault components currently come from the grammar.
// Later this can also be moved into model_data.json when fault scanning exists.
const faultComponents = [
    "Bridge Motor",
    "Traffic Barrier 1 Motor",
    "Traffic Barrier 2 Motor"
];

const faultActions = [
    "Disable",
    "Enable"
];


// ============================================================
// APPLICATION STATE
// ============================================================

let modelData = structuredClone(emptyModelData);
let modelSource = null;

let testcases = [
    createEmptyTestcase("Test1")
];

let activeTestcaseIndex = 0;


// ============================================================
// HTML ELEMENTS
// ============================================================

const suiteNameInput =
    document.getElementById("suiteName");

const testcaseNameInput =
    document.getElementById("testcaseName");

const testcaseTabs =
    document.getElementById("testcaseTabs");

const startConditionsContainer =
    document.getElementById("startConditions");

const stepsContainer =
    document.getElementById("steps");

const addTestcaseButton =
    document.getElementById("addTestcaseButton");

const deleteTestcaseButton =
    document.getElementById("deleteTestcaseButton");

const addStartButton =
    document.getElementById("addStartButton");

const addDetectionStepButton =
    document.getElementById("addDetectionStepButton");

const addFaultStepButton =
    document.getElementById("addFaultStepButton");

const addWaitStepButton =
    document.getElementById("addWaitStepButton");

const exportButton =
    document.getElementById("exportButton");

const copyButton =
    document.getElementById("copyButton");

const codeOutput =
    document.getElementById("codeOutput");

const errorMessage =
    document.getElementById("errorMessage");

const modelDataFile =
    document.getElementById("modelDataFile");

const loadModelButton =
    document.getElementById("loadModelButton");

const modelStatusDot =
    document.getElementById("modelStatusDot");

const modelStatusText =
    document.getElementById("modelStatusText");

const showModelButton =
    document.getElementById("showModelButton");

const resetSiteButton =
    document.getElementById("resetSiteButton");

const modelDialog =
    document.getElementById("modelDialog");

const closeModelDialog =
    document.getElementById("closeModelDialog");

const modelInfo =
    document.getElementById("modelInfo");


// ============================================================
// DATA HELPERS
// ============================================================

function createEmptyTestcase(name) {
    return {
        name: name,
        startConditions: [],
        steps: []
    };
}


function createDetectionInput() {
    const detector = getDetectorNames()[0] || "";
    const input = getInputsForDetector(detector)[0] || "";

    return {
        type: "detection",
        detector: detector,
        input: input
    };
}


function createFaultInput() {
    return {
        type: "fault",
        action: faultActions[0],
        component: faultComponents[0]
    };
}


function createDefaultCondition() {
    const object = getConditionObjects()[0] || "";
    const state = getStatesForObject(object)[0] || "";

    return {
        object: object,
        state: state
    };
}


function createInputStep(type) {
    return {
        type: type,
        input:
            type === "fault"
                ? createFaultInput()
                : createDetectionInput(),
        condition: createDefaultCondition()
    };
}


function createWaitStep() {
    return {
        type: "wait",
        seconds: 5
    };
}


function getActiveTestcase() {
    return testcases[activeTestcaseIndex];
}


function getDetectorNames() {
    return [
        ...new Set(
            (modelData.detections || [])
                .map(item => item.object)
                .filter(Boolean)
        )
    ];
}


function getInputsForDetector(detector) {
    return [
        ...new Set(
            (modelData.detections || [])
                .filter(item => item.object === detector)
                .map(item => item.input)
                .filter(Boolean)
        )
    ];
}


function getConditionObjects() {
    return [
        ...new Set(
            (modelData.states || [])
                .map(item => item.object)
                .filter(Boolean)
        )
    ];
}


function getStatesForObject(object) {
    return [
        ...new Set(
            (modelData.states || [])
                .filter(item => item.object === object)
                .map(item => item.state)
                .filter(Boolean)
        )
    ];
}


// Friendly UI label.
// The generated language still uses the exact value from model_data.json.
function friendlyInputName(input) {
    const lower = String(input).toLowerCase();

    if (lower === "u_on" || lower === "on") {
        return "Activate";
    }

    if (lower === "u_off" || lower === "off") {
        return "Deactivate";
    }

    if (lower === "u_fault" || lower === "fault") {
        return "Apply fault";
    }

    if (lower === "u_repair" || lower === "repair") {
        return "Repair";
    }

    return input;
}


function sanitizeIdentifier(value, fallback) {
    const trimmed = String(value || "").trim();
    const cleaned = trimmed
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .replace(/_+/g, "_");

    if (!cleaned) {
        return fallback;
    }

    if (!/^[a-zA-Z]/.test(cleaned)) {
        return `T_${cleaned}`;
    }

    return cleaned;
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// LOCAL STORAGE
// ============================================================

const STORAGE_KEY = "testSuiteBuilder";

function saveData() {
    const data = {
        suiteName: suiteNameInput.value,
        testcases: testcases,
        activeTestcaseIndex: activeTestcaseIndex,
        modelData: modelData,
        modelSource: modelSource
    };

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );
}

function loadData() {
    const saved =
        localStorage.getItem(STORAGE_KEY);

    if (!saved) {
        return;
    }

    try {
        const data = JSON.parse(saved);

        if (
            Array.isArray(data.testcases) &&
            data.testcases.length > 0
        ) {
            testcases = data.testcases;
        }

        if (typeof data.suiteName === "string") {
            suiteNameInput.value = data.suiteName;
        }

        if (
            Number.isInteger(data.activeTestcaseIndex) &&
            data.activeTestcaseIndex >= 0 &&
            data.activeTestcaseIndex < testcases.length
        ) {
            activeTestcaseIndex =
                data.activeTestcaseIndex;
        }

        if (validateModelData(data.modelData)) {
            modelData = data.modelData;
            modelSource =
                data.modelSource || "Saved model data";
        }
    } catch (error) {
        console.warn(
            "Could not load saved test suite.",
            error
        );
    }
}


function resetSite() {
    const confirmed = confirm(
        "Reset the complete test suite and loaded model data?"
    );

    if (!confirmed) {
        return;
    }

    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}


// ============================================================
// MODEL DATA
// ============================================================

function validateModelData(data) {
    return (
        data &&
        Array.isArray(data.detections) &&
        Array.isArray(data.states)
    );
}


function applyModelData(data, source) {
    if (!validateModelData(data)) {
        throw new Error(
            "The JSON file must contain 'detections' and 'states' arrays."
        );
    }

    modelData = data;
    modelSource = source;

    repairSelectionsAfterModelChange();
    updateModelStatus();
    renderEverything();
}


function repairSelectionsAfterModelChange() {
    const detectorNames = getDetectorNames();
    const conditionObjects = getConditionObjects();

    for (const testcase of testcases) {
        for (const startCondition of testcase.startConditions) {
            if (startCondition.type === "detection") {
                if (!detectorNames.includes(startCondition.detector)) {
                    startCondition.detector = detectorNames[0] || "";
                }

                const inputs =
                    getInputsForDetector(startCondition.detector);

                if (!inputs.includes(startCondition.input)) {
                    startCondition.input = inputs[0] || "";
                }
            }
        }

        for (const step of testcase.steps) {
            if (step.type === "detection") {
                if (!detectorNames.includes(step.input.detector)) {
                    step.input.detector = detectorNames[0] || "";
                }

                const inputs =
                    getInputsForDetector(step.input.detector);

                if (!inputs.includes(step.input.input)) {
                    step.input.input = inputs[0] || "";
                }
            }

            if (step.type !== "wait") {
                if (!conditionObjects.includes(step.condition.object)) {
                    step.condition.object =
                        conditionObjects[0] || "";
                }

                const states =
                    getStatesForObject(step.condition.object);

                if (!states.includes(step.condition.state)) {
                    step.condition.state =
                        states[0] || "";
                }
            }
        }
    }
}


function updateModelStatus() {
    const detectorCount = getDetectorNames().length;
    const stateCount = (modelData.states || []).length;

    if (!modelSource) {
        modelStatusDot.classList.remove("loaded");
        modelStatusText.textContent =
            "No model data loaded";
        return;
    }

    modelStatusDot.classList.add("loaded");
    modelStatusText.textContent =
        `${modelSource}: ${detectorCount} detectors, ${stateCount} states`;
}


async function tryAutoLoadModelData() {
    try {
        const response = await fetch("model_data.json", {
            cache: "no-store"
        });

        if (!response.ok) {
            return;
        }

        const data = await response.json();
        applyModelData(data, "model_data.json");
    } catch (error) {
        // Opening index.html directly with file:// often blocks fetch.
        // The manual file picker below still works.
    }
}


async function loadSelectedModelFile(file) {
    const text = await file.text();
    const data = JSON.parse(text);

    applyModelData(data, file.name);
}


function showModelInformation() {
    const detectorNames = getDetectorNames();
    const conditionObjects = getConditionObjects();

    const detectorHtml =
        detectorNames.length > 0
            ? detectorNames.map(detector => {
                const inputs =
                    getInputsForDetector(detector)
                        .map(input =>
                            `<span class="pill">${escapeHtml(friendlyInputName(input))}</span>`
                        )
                        .join(" ");

                return `
                    <li>
                        <strong>${escapeHtml(detector)}</strong>
                        <div class="pill-row">${inputs}</div>
                    </li>
                `;
            }).join("")
            : "<li>No detections found.</li>";

    const stateHtml =
        conditionObjects.length > 0
            ? conditionObjects.map(object => {
                const states =
                    getStatesForObject(object)
                        .map(state =>
                            `<span class="pill">${escapeHtml(state)}</span>`
                        )
                        .join(" ");

                return `
                    <li>
                        <strong>${escapeHtml(object)}</strong>
                        <div class="pill-row">${states}</div>
                    </li>
                `;
            }).join("")
            : "<li>No object states found.</li>";

    modelInfo.innerHTML = `
        <div class="model-info-grid">
            <div>
                <h3>Detections</h3>
                <ul class="model-list">${detectorHtml}</ul>
            </div>

            <div>
                <h3>Conditions</h3>
                <ul class="model-list">${stateHtml}</ul>
            </div>
        </div>
    `;

    modelDialog.showModal();
}


// ============================================================
// TESTCASE MANAGEMENT
// ============================================================

function addTestcase() {
    const number = testcases.length + 1;

    testcases.push(
        createEmptyTestcase(`Test${number}`)
    );

    activeTestcaseIndex = testcases.length - 1;
    renderEverything();

    testcaseNameInput.focus();
    testcaseNameInput.select();
}


function deleteActiveTestcase() {
    if (testcases.length === 1) {
        errorMessage.textContent =
            "A test suite must contain at least one test case.";
        return;
    }

    testcases.splice(activeTestcaseIndex, 1);

    activeTestcaseIndex = Math.min(
        activeTestcaseIndex,
        testcases.length - 1
    );

    renderEverything();
}


function setActiveTestcase(index) {
    activeTestcaseIndex = index;
    renderEverything();
}


function addStartCondition() {
    getActiveTestcase().startConditions.push({
        type: "detection",
        detector: getDetectorNames()[0] || "",
        input: getInputsForDetector(getDetectorNames()[0] || "")[0] || "",
        action: faultActions[0],
        component: faultComponents[0]
    });

    renderEverything();
}


function removeStartCondition(index) {
    getActiveTestcase().startConditions.splice(index, 1);
    renderEverything();
}


function addStep(type) {
    const step =
        type === "wait"
            ? createWaitStep()
            : createInputStep(type);

    getActiveTestcase().steps.push(step);
    renderEverything();
}


function removeStep(index) {
    getActiveTestcase().steps.splice(index, 1);
    renderEverything();
}


function moveStep(index, direction) {
    const steps = getActiveTestcase().steps;
    const targetIndex = index + direction;

    if (
        targetIndex < 0 ||
        targetIndex >= steps.length
    ) {
        return;
    }

    [steps[index], steps[targetIndex]] =
        [steps[targetIndex], steps[index]];

    renderEverything();
}


// ============================================================
// GENERIC HTML CONTROLS
// ============================================================

function optionHtml(value, selectedValue, label = value) {
    return `
        <option
            value="${escapeHtml(value)}"
            ${value === selectedValue ? "selected" : ""}
        >
            ${escapeHtml(label)}
        </option>
    `;
}


function detectorSelectHtml(
    detector,
    dataRole,
    index
) {
    const detectors = getDetectorNames();

    if (detectors.length === 0) {
        return `
            <select disabled>
                <option>No detectors found</option>
            </select>
        `;
    }

    return `
        <select
            data-role="${dataRole}"
            data-index="${index}"
        >
            ${detectors
                .map(value =>
                    optionHtml(value, detector)
                )
                .join("")}
        </select>
    `;
}


function detectorInputSelectHtml(
    detector,
    input,
    dataRole,
    index
) {
    const inputs = getInputsForDetector(detector);

    if (inputs.length === 0) {
        return `
            <select disabled>
                <option>No inputs found</option>
            </select>
        `;
    }

    return `
        <select
            data-role="${dataRole}"
            data-index="${index}"
        >
            ${inputs
                .map(value =>
                    optionHtml(
                        value,
                        input,
                        friendlyInputName(value)
                    )
                )
                .join("")}
        </select>
    `;
}


function conditionObjectSelectHtml(
    object,
    index
) {
    const objects = getConditionObjects();

    if (objects.length === 0) {
        return `
            <select disabled>
                <option>No states found</option>
            </select>
        `;
    }

    return `
        <select
            data-role="condition-object"
            data-index="${index}"
        >
            ${objects
                .map(value =>
                    optionHtml(value, object)
                )
                .join("")}
        </select>
    `;
}


function conditionStateSelectHtml(
    object,
    state,
    index
) {
    const states = getStatesForObject(object);

    if (states.length === 0) {
        return `
            <select disabled>
                <option>No states found</option>
            </select>
        `;
    }

    return `
        <select
            data-role="condition-state"
            data-index="${index}"
        >
            ${states
                .map(value =>
                    optionHtml(value, state)
                )
                .join("")}
        </select>
    `;
}


// ============================================================
// RENDER TESTCASE TABS
// ============================================================

function renderTestcaseTabs() {
    testcaseTabs.innerHTML = "";

    testcases.forEach((testcase, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "testcase-tab";

        if (index === activeTestcaseIndex) {
            button.classList.add("active");
        }

        const safeName =
            sanitizeIdentifier(
                testcase.name,
                `Test${index + 1}`
            );

        button.innerHTML = `
            <span class="tab-number">${index + 1}</span>
            <span>${escapeHtml(safeName)}</span>
            <span class="tab-count">${testcase.steps.length}</span>
        `;

        button.addEventListener(
            "click",
            () => setActiveTestcase(index)
        );

        testcaseTabs.appendChild(button);
    });
}


// ============================================================
// RENDER START CONDITIONS
// ============================================================

function renderStartConditions() {
    const testcase = getActiveTestcase();

    if (testcase.startConditions.length === 0) {
        startConditionsContainer.innerHTML = `
            <div class="empty-state">
                <strong>No start conditions</strong>
                <span>
                    The test starts without applying an input first
                </span>
            </div>
        `;
        return;
    }

    startConditionsContainer.innerHTML =
        testcase.startConditions
            .map((condition, index) => {
                const inputControls = condition.type === "fault"
                    ? `
                        <select data-role="start-fault-action" data-index="${index}">
                            ${faultActions.map(value => optionHtml(value, condition.action)).join("")}
                        </select>
                        <select data-role="start-fault-component" data-index="${index}">
                            ${faultComponents.map(value => optionHtml(value, condition.component)).join("")}
                        </select>
                    `
                    : `
                        ${detectorInputSelectHtml(condition.detector, condition.input, "start-input", index)}
                        ${detectorSelectHtml(condition.detector, "start-detector", index)}
                    `;

                return `
                    <div class="builder-row start-row">
                        <div class="step-badge start">Start</div>

                        <div class="step-content">
                            <div class="step-type-label">Start input</div>
                            <div class="inline-sentence">
                                <span class="sentence-word">with</span>
                                <select data-role="start-type" data-index="${index}">
                                    ${optionHtml("detection", condition.type, "Detection")}
                                    ${optionHtml("fault", condition.type, "Fault")}
                                </select>
                                ${inputControls}
                            </div>
                        </div>

                        <button
                            type="button"
                            class="icon-action remove"
                            data-action="remove-start"
                            data-index="${index}"
                            title="Remove start condition"
                        >×</button>
                    </div>
                `;
            })
            .join("");
}


// ============================================================
// RENDER STEPS
// ============================================================

function renderSteps() {
    const testcase = getActiveTestcase();

    if (testcase.steps.length === 0) {
        stepsContainer.innerHTML = `
            <div class="empty-state">
                <strong>No steps yet</strong>
                <span>
                    Add a detection, fault or wait step
                </span>
            </div>
        `;
        return;
    }

    stepsContainer.innerHTML =
        testcase.steps
            .map((step, index) => {
                if (step.type === "wait") {
                    return renderWaitStep(step, index);
                }

                return renderInputStep(step, index);
            })
            .join("");
}


function renderInputStep(step, index) {
    const inputHtml =
        step.type === "fault"
            ? `
                <select
                    data-role="fault-action"
                    data-index="${index}"
                >
                    ${faultActions
                        .map(value =>
                            optionHtml(
                                value,
                                step.input.action
                            )
                        )
                        .join("")}
                </select>

                <select
                    data-role="fault-component"
                    data-index="${index}"
                >
                    ${faultComponents
                        .map(value =>
                            optionHtml(
                                value,
                                step.input.component
                            )
                        )
                        .join("")}
                </select>
            `
            : `
                ${detectorInputSelectHtml(
                    step.input.detector,
                    step.input.input,
                    "step-input",
                    index
                )}

                ${detectorSelectHtml(
                    step.input.detector,
                    "step-detector",
                    index
                )}
            `;

    return `
        <div class="builder-row step-row">
            <div class="step-badge">${index + 1}</div>

            <div class="step-content">
                <div class="step-type-label">
                    ${step.type === "fault" ? "Fault input" : "Detection input"}
                </div>

                <div class="inline-sentence">
                    ${inputHtml}

                    <span class="sentence-word">when</span>

                    ${conditionObjectSelectHtml(
                        step.condition.object,
                        index
                    )}

                    <span class="sentence-word">is</span>

                    ${conditionStateSelectHtml(
                        step.condition.object,
                        step.condition.state,
                        index
                    )}
                </div>
            </div>

            ${stepActionButtons(index)}
        </div>
    `;
}


function renderWaitStep(step, index) {
    return `
        <div class="builder-row step-row">
            <div class="step-badge">${index + 1}</div>

            <div class="step-content">
                <div class="step-type-label">
                    Wait
                </div>

                <div class="inline-sentence">
                    <span class="sentence-word">Wait</span>

                    <input
                        class="small-number"
                        data-role="wait-seconds"
                        data-index="${index}"
                        type="number"
                        min="0"
                        step="1"
                        value="${escapeHtml(step.seconds)}"
                    >

                    <span class="sentence-word">seconds</span>
                </div>
            </div>

            ${stepActionButtons(index)}
        </div>
    `;
}


function stepActionButtons(index) {
    const lastIndex =
        getActiveTestcase().steps.length - 1;

    return `
        <div class="row-actions">
            <button
                type="button"
                class="icon-action"
                data-action="move-up"
                data-index="${index}"
                ${index === 0 ? "disabled" : ""}
                title="Move up"
            >
                ↑
            </button>

            <button
                type="button"
                class="icon-action"
                data-action="move-down"
                data-index="${index}"
                ${index === lastIndex ? "disabled" : ""}
                title="Move down"
            >
                ↓
            </button>

            <button
                type="button"
                class="icon-action remove"
                data-action="remove-step"
                data-index="${index}"
                title="Remove step"
            >
                ×
            </button>
        </div>
    `;
}


// ============================================================
// GENERATED LANGUAGE
// ============================================================

function inputToLanguage(input) {
    if (input.type === "fault") {
        return `${input.action} ${input.component}`;
    }

    return `${input.input} ${input.detector}`;
}


function stepToLanguage(step) {
    if (step.type === "wait") {
        const seconds =
            Math.max(
                0,
                Math.round(Number(step.seconds) || 0)
            );

        return `Wait ${seconds} seconds`;
    }

    return (
        `${inputToLanguage(step.input)} ` +
        `when ${step.condition.object} is ${step.condition.state}`
    );
}


function generateLanguage() {
    const suiteName =
        sanitizeIdentifier(
            suiteNameInput.value,
            "TestSuite1"
        );

    const lines = [
        `TestSuite ${suiteName}:`,
        ""
    ];

    testcases.forEach((testcase, testcaseIndex) => {
        const testName =
            sanitizeIdentifier(
                testcase.name,
                `Test${testcaseIndex + 1}`
            );

        lines.push(`Test ${testName}:`);

        for (const startCondition of testcase.startConditions) {
            lines.push(
                `    Start with ${inputToLanguage(startCondition)}`
            );
        }

        for (const step of testcase.steps) {
            lines.push(
                `    ${stepToLanguage(step)}`
            );
        }

        lines.push("");
    });

    return lines.join("\n").trimEnd() + "\n";
}


function updatePreview() {
    codeOutput.textContent =
        generateLanguage();
}


// ============================================================
// VALIDATION + EXPORT
// ============================================================

function validateSuite() {
    errorMessage.textContent = "";

    if (testcases.length === 0) {
        errorMessage.textContent =
            "Add at least one test case.";
        return false;
    }

    for (
        let testcaseIndex = 0;
        testcaseIndex < testcases.length;
        testcaseIndex++
    ) {
        const testcase = testcases[testcaseIndex];

        // The current grammar requires step+.
        if (testcase.steps.length === 0) {
            errorMessage.textContent =
                `Test case ${testcaseIndex + 1} needs at least one test step.`;

            setActiveTestcase(testcaseIndex);
            return false;
        }

        for (const step of testcase.steps) {
            if (
                step.type !== "wait" &&
                (
                    !step.condition.object ||
                    !step.condition.state
                )
            ) {
                errorMessage.textContent =
                    `Test case ${testcaseIndex + 1} has an incomplete condition.`;

                setActiveTestcase(testcaseIndex);
                return false;
            }
        }
    }

    return true;
}


function exportTextFile() {
    if (!validateSuite()) {
        return;
    }

    const language = generateLanguage();

    const blob =
        new Blob(
            [language],
            { type: "text/plain;charset=utf-8" }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    const suiteName =
        sanitizeIdentifier(
            suiteNameInput.value,
            "TestSuite1"
        );

    link.href = url;
    link.download = `${suiteName}.txt`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}


async function copyGeneratedLanguage() {
    const language = generateLanguage();

    try {
        await navigator.clipboard.writeText(language);

        copyButton.textContent = "Copied";

        setTimeout(
            () => {
                copyButton.textContent = "Copy";
            },
            1200
        );
    } catch (error) {
        errorMessage.textContent =
            "Copy was blocked by the browser. Select the preview text manually.";
    }
}


// ============================================================
// CHANGE HANDLERS
// ============================================================

function handleStartConditionChange(event) {
    const select = event.target.closest(
        "[data-role]"
    );

    if (!select) {
        return;
    }

    const index =
        Number(select.dataset.index);

    const condition =
        getActiveTestcase().startConditions[index];

    if (!condition) {
        return;
    }

    if (select.dataset.role === "start-type") {
        condition.type = select.value;
        renderEverything();
        return;
    }

    if (select.dataset.role === "start-detector") {
        condition.detector = select.value;
        condition.input =
            getInputsForDetector(condition.detector)[0] || "";

        renderEverything();
        return;
    }

    if (select.dataset.role === "start-input") {
        condition.input = select.value;
        updatePreview();
        saveData();
        return;
    }

    if (select.dataset.role === "start-fault-action") {
        condition.action = select.value;
        updatePreview();
        saveData();
        return;
    }

    if (select.dataset.role === "start-fault-component") {
        condition.component = select.value;
        updatePreview();
        saveData();
    }
}


function handleStepChange(event) {
    const element = event.target.closest(
        "[data-role]"
    );

    if (!element) {
        return;
    }

    const index =
        Number(element.dataset.index);

    const step =
        getActiveTestcase().steps[index];

    if (!step) {
        return;
    }

    switch (element.dataset.role) {
        case "step-detector":
            step.input.detector = element.value;
            step.input.input =
                getInputsForDetector(
                    step.input.detector
                )[0] || "";

            renderEverything();
            break;

        case "step-input":
            step.input.input = element.value;
            updatePreview();
            saveData();
            break;

        case "fault-action":
            step.input.action = element.value;
            updatePreview();
            saveData();
            break;

        case "fault-component":
            step.input.component = element.value;
            updatePreview();
            saveData();
            break;

        case "condition-object":
            step.condition.object = element.value;
            step.condition.state =
                getStatesForObject(
                    step.condition.object
                )[0] || "";

            renderEverything();
            break;

        case "condition-state":
            step.condition.state = element.value;
            updatePreview();
            saveData();
            break;

        case "wait-seconds":
            step.seconds = element.value;
            updatePreview();
            saveData();
            break;
    }
}


function handleBuilderButtonClick(event) {
    const button =
        event.target.closest("[data-action]");

    if (!button) {
        return;
    }

    const index =
        Number(button.dataset.index);

    switch (button.dataset.action) {
        case "remove-start":
            removeStartCondition(index);
            break;

        case "remove-step":
            removeStep(index);
            break;

        case "move-up":
            moveStep(index, -1);
            break;

        case "move-down":
            moveStep(index, 1);
            break;
    }
}


// ============================================================
// RENDER ALL
// ============================================================

function renderEverything() {
    const testcase = getActiveTestcase();

    testcaseNameInput.value =
        testcase.name;

    deleteTestcaseButton.disabled =
        testcases.length === 1;

    renderTestcaseTabs();
    renderStartConditions();
    renderSteps();
    updatePreview();
    updateModelStatus();

    errorMessage.textContent = "";

    saveData();
}


// ============================================================
// EVENT LISTENERS
// ============================================================

suiteNameInput.addEventListener(
    "input",
    () => {
        updatePreview();
        saveData();
    }
);


testcaseNameInput.addEventListener(
    "input",
    () => {
        getActiveTestcase().name =
            testcaseNameInput.value;

        renderTestcaseTabs();
        updatePreview();
        saveData();
    }
);


addTestcaseButton.addEventListener(
    "click",
    addTestcase
);


deleteTestcaseButton.addEventListener(
    "click",
    deleteActiveTestcase
);


addStartButton.addEventListener(
    "click",
    addStartCondition
);


addDetectionStepButton.addEventListener(
    "click",
    () => addStep("detection")
);


addFaultStepButton.addEventListener(
    "click",
    () => addStep("fault")
);


addWaitStepButton.addEventListener(
    "click",
    () => addStep("wait")
);


startConditionsContainer.addEventListener(
    "change",
    handleStartConditionChange
);


startConditionsContainer.addEventListener(
    "click",
    handleBuilderButtonClick
);


stepsContainer.addEventListener(
    "change",
    handleStepChange
);


stepsContainer.addEventListener(
    "input",
    handleStepChange
);


stepsContainer.addEventListener(
    "click",
    handleBuilderButtonClick
);


exportButton.addEventListener(
    "click",
    exportTextFile
);


copyButton.addEventListener(
    "click",
    copyGeneratedLanguage
);


loadModelButton.addEventListener(
    "click",
    () => modelDataFile.click()
);


modelDataFile.addEventListener(
    "change",
    async () => {
        const file = modelDataFile.files[0];

        if (!file) {
            return;
        }

        try {
            await loadSelectedModelFile(file);
        } catch (error) {
            errorMessage.textContent =
                `Could not load model data: ${error.message}`;
        }

        modelDataFile.value = "";
    }
);


resetSiteButton.addEventListener(
    "click",
    resetSite
);


showModelButton.addEventListener(
    "click",
    showModelInformation
);


closeModelDialog.addEventListener(
    "click",
    () => modelDialog.close()
);


modelDialog.addEventListener(
    "click",
    event => {
        if (event.target === modelDialog) {
            modelDialog.close();
        }
    }
);


// ============================================================
// START WEBSITE
// ============================================================

loadData();
renderEverything();
tryAutoLoadModelData();
