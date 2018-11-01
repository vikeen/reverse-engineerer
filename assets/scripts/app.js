const fs = require('fs');
const path = require('path');
const homeDir = require('os').homedir();
const projectsDir = path.join(homeDir, 'ReverseEngineer');
const exec = require('child_process').exec;

const execute = (command, options, callback) => {
    exec(command, options, callback);
};

class Logger {
    constructor() {
        this.$consoleContainer = document.getElementsByClassName('project-console-container')[0];
    }

    info(message = "") {
        this._logMessage(message, "info");
    }

    error(message = "") {
        this._logMessage(message, "error");
    }

    _logMessage(message = "", type) {
        const cssClass = `logger-message__${type}`;
        const formattedMessage = message.split("\n").join("</br>");
        this.$consoleContainer.innerHTML = `<p class=${cssClass}>${formattedMessage}</p>`;

        // leave for debugging purposes;
        console.log(message);
    }
}

const projects = {
    "nodejs-tutorial": {
        id: "nodejs-tutorial",
        lessons: [
            {
                title: "Say hello",
                objectives: [
                    {
                        id: "1-hello-world-console",
                        label: `<p>use <span class="objective__code">console.log</span> to output 'Hello world!' to the console</p>`,
                        type: "stdout",
                        validator: (stdout) => {
                            const linesOfOutput = stdout.split("\n");
                            return linesOfOutput[0] === "Hello world!";
                        }
                    }
                ]
            },
            {
                title: "And a polite goodbye",
                objectives: [
                    {
                        id: "1-goodbye-world-console",
                        label: `<p>use <span class="objective__code">console.log</span> to output 'Goodbye World!' to the console</p>`,
                        type: "stdout",
                        validator: (stdout) => {
                            const linesOfOutput = stdout.split("\n");
                            return linesOfOutput[0] === "Goodbye World!";
                        }
                    }
                ]
            }
        ]
    }
};

App = {
    onAmdLoad: () => {
        App.amdHasLoaded = true;
        App.loadProject("nodejs-tutorial");
    },
    amdHasLoaded: false,
    mainEditor: null,
    logger: new Logger(),
    projectId: null,
    projectDir: null,
    runCode: () => {
        const filePath = path.join(projectsDir, App.projectId, "index.js");
        const model = App.mainEditor.getModel();
        const code = model.getValue();
        App.saveProjectFile(filePath, code);

        execute("node --check index.js", {cwd: App.projectDir}, (error, stdout, stderr) => {
            if (error || stderr) {
                App.logger.error(stderr);
            } else {
                execute('node index.js', {cwd: App.projectDir}, (error, stdout, stderr) => {
                    App.logger.info(stdout);
                    App.validateObjectives(stdout);
                });
            }
        });
    },

    setupProject: (language, projectId) => {
        const projectDir = path.join(projectsDir, projectId);

        if (!fs.existsSync(projectsDir)) {
            fs.mkdirSync(projectsDir);
        }

        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir);
        }

        // create package.json
        const packageJSON = JSON.stringify({
            "name": projectId,
            "version": "1.0.0",
            "description": projectId,
            "main": "index.js",
            "scripts": {
                "start": "node index.js"
            }
        }, null, 4);
        fs.writeFileSync(path.join(projectDir, "package.json"), packageJSON, 'utf8');

        const indexData = `function x() {
	console.log("Hello world!");
}`;
        fs.writeFileSync(path.join(projectDir, "index.js"), indexData, 'utf8');
        App.projectId = projectId;
        App.projectDir = projectDir;
    },

    loadProject: (projectId) => {
        const project = projects[projectId];
        const projectDir = path.join(projectsDir, projectId);
        const data = fs.readFileSync(path.join(projectDir, "index.js"), 'utf8');

        App.projectId = projectId;
        App.projectDir = projectDir;
        App.project = project;
        App.loadMainEditor(data, "javascript", projectId);
        App.loadLesson(project.lessons[0])
    },

    loadLesson: (lesson) => {
        App.lesson = lesson;
        const objectivesContainer = document.getElementsByClassName('project-objectives-container')[0];
        let objectivesHtml = `<h2>Objectives</h2>`;

        lesson.objectives.forEach(objective => {
            objectivesHtml += `<div id="${objective.id}" class="objective">
                <img id="${objective.id}-image"
                     src="assets/images/objective-default.png"
                     class="objective__icon"
                />
                ${objective.label}
            </div>`
        });
        objectivesHtml += `<br/><button onClick="App.runCode()">Run Code</button>`;

        objectivesContainer.innerHTML = objectivesHtml;
    },

    loadMainEditor: (value, language = "javascript", projectId) => {
        // monaco.editor.setTheme('vs-dark');


        const container = document.getElementById('CodeEditor');
        const editor = monaco.editor.create(container, {
            value,
            language
        });

        // SAVE CODE
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
            const filePath = path.join(projectsDir, projectId, "index.js");
            const model = editor.getModel();
            const code = model.getValue();
            App.saveProjectFile(filePath, code);
        });

        // RUN CODE
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            App.runCode();
        });

        App.mainEditor = editor;
    },

    saveProjectFile: (filePath, data) => {
        console.log("saving file...");
        return fs.writeFileSync(filePath, data, 'utf8');
    },

    validateObjectives: (stdout) => {
        const {project, lesson} = App;
        console.log("validating objectives...");

        lesson.objectives.forEach((objective) => App.validateObjective(objective, stdout));
        const allObjectivesPassed = !!lesson.objectives.every((objective) => App.validateObjective(objective, stdout));

        if (allObjectivesPassed) {
            const currentLessonIndex = project.lessons.indexOf(lesson);
            const nextLesson = project.lessons[currentLessonIndex + 1];

            if (nextLesson) {
                App.loadLesson(nextLesson);
            } else {
                alert("Project Complete!");
            }
        }
    },

    validateObjective: (objective, stdout) => {
        if (objective.type === "stdout") {
            const objectiveImage = document.getElementById(`${objective.id}-image`);

            if (objective.validator(stdout)) {
                objectiveImage.setAttribute('src', "assets/images/objective-pass.png");
                return true;
            } else {
                objectiveImage.setAttribute('src', "assets/images/objective-fail.png");
                return false;
            }
        } else {
            return false;
        }
    }
};