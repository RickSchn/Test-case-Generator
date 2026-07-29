// Defines the hierarchy of objects and their available actions.
//
// A node can have:
// - children: smaller objects inside it
// - actions: actions that can be performed on that object
//
// A node may have both children and actions.
// For example, "Traffic barriers" can be selected itself,
// but it can also be expanded to show Barrier 1 and Barrier 2.
const objectHierarchy = [
    {
        name: "Bridge",
        children: [
            {
                name: "Bridge deck",
                actions: [
                    "Open",
                    "Close"
                ]
            },

            {
                name: "Traffic barriers",
                actions: [
                    "Open",
                    "Close"
                ],

                children: [
                    {
                        name: "Barrier 1",
                        actions: [
                            "Open",
                            "Close"
                        ]
                    },

                    {
                        name: "Barrier 2",
                        actions: [
                            "Open",
                            "Close"
                        ]
                    }
                ]
            },

            {
                name: "Warning signals",
                actions: [
                    "Activate",
                    "Deactivate"
                ],

                children: [
                    {
                        name: "Warning lights",
                        actions: [
                            "Activate",
                            "Deactivate"
                        ]
                    },

                    {
                        name: "Audible signal",
                        actions: [
                            "Activate",
                            "Deactivate"
                        ]
                    }
                ]
            }
        ]
    },

    {
        name: "River traffic",
        children: [
            {
                name: "Boat downstream",
                actions: [
                    "Arrive",
                    "Enter",
                    "Leave"
                ]
            },

            {
                name: "Boat upstream",
                actions: [
                    "Arrive",
                    "Enter",
                    "Leave"
                ]
            }
        ]
    }
];


// Stores all test-case steps entered by the user.
const steps = [];


// Stores the currently selected object.
let selectedObject = null;


// Stores the HTML element of the selected object.
// This is used to highlight it.
let selectedObjectElement = null;


// Find webpage elements.
const testcaseNameInput =
    document.getElementById("testcaseName");

const objectTree =
    document.getElementById("objectTree");

const selectedObjectText =
    document.getElementById("selectedObjectText");

const actionSelect =
    document.getElementById("actionSelect");

const delayInput =
    document.getElementById("delayInput");

const addStepButton =
    document.getElementById("addStepButton");

const exportButton =
    document.getElementById("exportButton");

const clearButton =
    document.getElementById("clearButton");

const stepTableBody =
    document.getElementById("stepTableBody");

const jsonOutput =
    document.getElementById("jsonOutput");

const errorMessage =
    document.getElementById("errorMessage");


// Create the hierarchy recursively.
//
// "Recursively" means that this function can call itself.
// It creates a list, and if an object has children,
// it calls createTree again for those children.
function createTree(nodes, parentPath = "") {
    const list = document.createElement("ul");
    list.classList.add("tree-list");

    for (const node of nodes) {
        const listItem = document.createElement("li");
        listItem.classList.add("tree-item");

        const nodeRow = document.createElement("div");
        nodeRow.classList.add("tree-node-row");

        // Create a full path for the object.
        //
        // Example:
        // Bridge > Traffic barriers > Barrier 1
        const objectPath = parentPath
            ? `${parentPath} > ${node.name}`
            : node.name;

        // If the node has children, create an expand button.
        if (node.children && node.children.length > 0) {
            const expandButton =
                document.createElement("button");

            expandButton.type = "button";
            expandButton.classList.add(
                "tree-expand-button"
            );

            expandButton.textContent = "▶";
            expandButton.setAttribute(
                "aria-label",
                `Expand ${node.name}`
            );

            // Create the children, but keep them hidden initially.
            const childContainer =
                createTree(
                    node.children,
                    objectPath
                );

            childContainer.classList.add(
                "tree-children"
            );

            expandButton.addEventListener(
                "click",
                event => {
                    // Prevent this click from also selecting the object.
                    event.stopPropagation();

                    const isOpen =
                        childContainer.classList.toggle(
                            "open"
                        );

                    expandButton.textContent =
                        isOpen ? "▼" : "▶";

                    expandButton.setAttribute(
                        "aria-label",
                        `${isOpen ? "Collapse" : "Expand"} ${node.name}`
                    );
                }
            );

            nodeRow.appendChild(expandButton);
            listItem.appendChild(nodeRow);
            listItem.appendChild(childContainer);
        } else {
            // Add an empty spacer so all names line up.
            const spacer =
                document.createElement("span");

            spacer.classList.add(
                "tree-expand-spacer"
            );

            nodeRow.appendChild(spacer);
            listItem.appendChild(nodeRow);
        }

        // Create the visible object name.
        const nodeName =
            document.createElement("span");

        nodeName.textContent = node.name;
        nodeName.classList.add(
            "tree-node-name"
        );

        // If the node has actions, it can be selected.
        if (node.actions && node.actions.length > 0) {
            nodeName.classList.add(
                "tree-object"
            );

            nodeName.tabIndex = 0;
            nodeName.setAttribute(
                "role",
                "button"
            );

            nodeName.addEventListener(
                "click",
                () => {
                    selectObject(
                        node,
                        nodeName,
                        objectPath
                    );
                }
            );

            // Allow selecting with Enter or Space.
            nodeName.addEventListener(
                "keydown",
                event => {
                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {
                        event.preventDefault();

                        selectObject(
                            node,
                            nodeName,
                            objectPath
                        );
                    }
                }
            );
        } else {
            // A node without actions is only a category.
            nodeName.classList.add(
                "tree-category-name"
            );
        }

        nodeRow.appendChild(nodeName);
        list.appendChild(listItem);
    }

    return list;
}


// Load the complete object tree onto the page.
function loadObjectTree() {
    objectTree.innerHTML = "";

    const tree =
        createTree(objectHierarchy);

    objectTree.appendChild(tree);
}


// Select an object.
function selectObject(
    objectData,
    element,
    objectPath
) {
    selectedObject = {
        name: objectData.name,
        path: objectPath,
        actions: objectData.actions
    };

    selectedObjectText.textContent =
        objectData.name;

    // Remove the highlight from the previously selected object.
    if (selectedObjectElement) {
        selectedObjectElement.classList.remove(
            "selected"
        );
    }

    // Highlight the new selected object.
    element.classList.add("selected");
    selectedObjectElement = element;

    updateActions();
    errorMessage.textContent = "";
}


// Fill the action dropdown based on the selected object.
function updateActions() {
    actionSelect.innerHTML =
        '<option value="">Select an action</option>';

    if (!selectedObject) {
        actionSelect.disabled = true;
        return;
    }

    actionSelect.disabled = false;

    for (const action of selectedObject.actions) {
        const option =
            document.createElement("option");

        option.value = action;
        option.textContent = action;

        actionSelect.appendChild(option);
    }
}


// Add one step to the test case.
function addStep() {
    const action = actionSelect.value;
    const delay = Number(delayInput.value);

    errorMessage.textContent = "";

    if (!selectedObject) {
        errorMessage.textContent =
            "Select an object.";

        return;
    }

    if (!action) {
        errorMessage.textContent =
            "Select an action.";

        return;
    }

    if (
        !Number.isFinite(delay) ||
        delay < 0
    ) {
        errorMessage.textContent =
            "Delay must be zero or greater.";

        return;
    }

    steps.push({
        object: selectedObject.name,
        // objectPath: selectedObject.path,
        action: action,
        delay: delay
    });

    renderSteps();

    // Reset action and delay,
    // but keep the same object selected.
    actionSelect.value = "";
    delayInput.value = 0;
}


// Display all steps in the table.
function renderSteps() {
    stepTableBody.innerHTML = "";

    steps.forEach((step, index) => {
        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${step.object}</td>
            <td>${step.action}</td>
            <td>${step.delay} s</td>
            <td>
                <button
                    type="button"
                    class="move-up-button"
                    data-index="${index}"
                    ${index === 0 ? "disabled" : ""}
                >
                    ↑
                </button>

                <button
                    type="button"
                    class="move-down-button"
                    data-index="${index}"
                    ${
                        index === steps.length - 1
                            ? "disabled"
                            : ""
                    }
                >
                    ↓
                </button>

                <button
                    type="button"
                    class="remove-button"
                    data-index="${index}"
                >
                    Remove
                </button>
            </td>
        `;

        stepTableBody.appendChild(row);
    });

    updateJsonPreview();
}


// Remove one step.
function removeStep(index) {
    steps.splice(index, 1);
    renderSteps();
}


// Move one step upward.
function moveStepUp(index) {
    if (index <= 0) {
        return;
    }

    const temporaryStep =
        steps[index - 1];

    steps[index - 1] =
        steps[index];

    steps[index] =
        temporaryStep;

    renderSteps();
}


// Move one step downward.
function moveStepDown(index) {
    if (index >= steps.length - 1) {
        return;
    }

    const temporaryStep =
        steps[index + 1];
 
    steps[index + 1] =
        steps[index];

    steps[index] =
        temporaryStep;

    renderSteps();
}


// Create the JSON object.
function createTestcaseData() {
    const testcaseName =
        testcaseNameInput.value.trim();

    return {
        name:
            testcaseName ||
            "UnnamedTest",

        steps: steps
    };
}


// Show the generated JSON.
function updateJsonPreview() {
    const testcaseData =
        createTestcaseData();

    jsonOutput.textContent =
        JSON.stringify(
            testcaseData,
            null,
            2
        );
}


// Download the JSON file.
function exportJson() {
    errorMessage.textContent = "";

    if (steps.length === 0) {
        errorMessage.textContent =
            "Add at least one step before exporting.";

        return;
    }

    const testcaseData =
        createTestcaseData();

    const jsonText =
        JSON.stringify(
            testcaseData,
            null,
            2
        );

    const file =
        new Blob(
            [jsonText],
            {
                type:
                    "application/json"
            }
        );

    const downloadUrl =
        URL.createObjectURL(file);

    const link =
        document.createElement("a");

    link.href = downloadUrl;

    link.download =
        `${makeSafeFilename(
            testcaseData.name
        )}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(downloadUrl);
}


// Replace characters that are unsafe in filenames.
function makeSafeFilename(filename) {
    return filename
        .replace(
            /[<>:"/\\|?*]/g,
            "_"
        )
        .trim();
}


// Clear all entered steps.
function clearSteps() {
    steps.length = 0;
    errorMessage.textContent = "";
    renderSteps();
}


// Listen for clicks on table buttons.
function handleTableButtonClick(event) {
    const clickedButton =
        event.target.closest("button");

    if (!clickedButton) {
        return;
    }

    const index =
        Number(
            clickedButton.dataset.index
        );

    if (!Number.isInteger(index)) {
        return;
    }

    if (
        clickedButton.classList.contains(
            "remove-button"
        )
    ) {
        removeStep(index);
        return;
    }

    if (
        clickedButton.classList.contains(
            "move-up-button"
        )
    ) {
        moveStepUp(index);
        return;
    }

    if (
        clickedButton.classList.contains(
            "move-down-button"
        )
    ) {
        moveStepDown(index);
    }
}


// Event listeners.
addStepButton.addEventListener(
    "click",
    addStep
);

exportButton.addEventListener(
    "click",
    exportJson
);

clearButton.addEventListener(
    "click",
    clearSteps
);

testcaseNameInput.addEventListener(
    "input",
    updateJsonPreview
);

stepTableBody.addEventListener(
    "click",
    handleTableButtonClick
);


// Allow Enter in the delay input to add the step.
delayInput.addEventListener(
    "keydown",
    event => {
        if (event.key === "Enter") {
            event.preventDefault();
            addStep();
        }
    }
);


// Start the webpage.
loadObjectTree();
updateActions();
updateJsonPreview();