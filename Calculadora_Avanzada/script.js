"use strict";

/*
 * ============================================================
 * CALCULADORA AVANZADA
 * ============================================================
 *
 * Características:
 * - Parser matemático propio
 * - Sin eval()
 * - Precedencia matemática correcta
 * - Funciones científicas
 * - Porcentajes
 * - Memoria
 * - Historial
 * - Tema claro/oscuro
 * - Soporte de teclado
 * - DEG/RAD
 */


/* ============================================================
   ESTADO
============================================================ */

const state = {
    expression: "",
    result: "0",
    memory: 0,
    angleMode: "DEG",
    scientific: true,
    history: [],
    justCalculated: false,
    error: false
};


/* ============================================================
   ELEMENTOS DOM
============================================================ */

const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");
const displayMessageEl = document.getElementById("displayMessage");
const angleModeEl = document.getElementById("angleMode");
const memoryIndicatorEl = document.getElementById("memoryIndicator");

const scientificPanel =
    document.getElementById("scientificPanel");

const scientificToggle =
    document.getElementById("scientificToggle");

const angleToggle =
    document.getElementById("angleToggle");

const themeToggle =
    document.getElementById("themeToggle");

const historyToggle =
    document.getElementById("historyToggle");

const historyPanel =
    document.getElementById("historyPanel");

const historyList =
    document.getElementById("historyList");

const historyCount =
    document.getElementById("historyCount");


/* ============================================================
   UTILIDADES
============================================================ */

function formatNumber(value) {

    if (!Number.isFinite(value)) {
        throw new Error("Resultado inválido");
    }

    if (Object.is(value, -0)) {
        value = 0;
    }

    const absolute = Math.abs(value);

    if (
        absolute !== 0 &&
        (absolute >= 1e12 || absolute < 1e-10)
    ) {
        return value.toExponential(10)
            .replace(/\.?0+e/, "e");
    }

    return Number(value.toPrecision(12)).toString();
}


function normalizeExpression(expression) {

    return expression
        .replaceAll("×", "*")
        .replaceAll("÷", "/")
        .replaceAll("−", "-")
        .replaceAll("π", "pi");
}


function isOperator(char) {

    return [
        "+",
        "-",
        "*",
        "/",
        "^",
        "mod"
    ].includes(char);
}


/* ============================================================
   TOKENIZADOR
============================================================ */

function tokenize(expression) {

    const input = normalizeExpression(expression);

    const tokens = [];

    let i = 0;

    while (i < input.length) {

        const char = input[i];

        // Espacios
        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Número
        if (
            /\d/.test(char) ||
            char === "."
        ) {

            let number = "";

            let dots = 0;

            while (
                i < input.length &&
                (
                    /\d/.test(input[i]) ||
                    input[i] === "."
                )
            ) {

                if (input[i] === ".") {
                    dots++;
                }

                number += input[i];

                i++;
            }

            if (dots > 1 || number === ".") {
                throw new Error("Número inválido");
            }

            tokens.push({
                type: "number",
                value: Number(number)
            });

            continue;
        }


        // Identificadores
        if (/[a-zA-Z]/.test(char)) {

            let identifier = "";

            while (
                i < input.length &&
                /[a-zA-Z]/.test(input[i])
            ) {

                identifier += input[i];

                i++;
            }

            const lower = identifier.toLowerCase();

            if (lower === "pi") {

                tokens.push({
                    type: "number",
                    value: Math.PI
                });

            } else if (lower === "e") {

                tokens.push({
                    type: "number",
                    value: Math.E
                });

            } else if (lower === "mod") {

                tokens.push({
                    type: "operator",
                    value: "mod"
                });

            } else {

                tokens.push({
                    type: "function",
                    value: lower
                });
            }

            continue;
        }


        // Operadores
        if ("+-*/^".includes(char)) {

            tokens.push({
                type: "operator",
                value: char
            });

            i++;

            continue;
        }


        // Porcentaje
        if (char === "%") {

            tokens.push({
                type: "percent",
                value: "%"
            });

            i++;

            continue;
        }


        // Factorial
        if (char === "!") {

            tokens.push({
                type: "factorial",
                value: "!"
            });

            i++;

            continue;
        }


        // Paréntesis
        if (char === "(") {

            tokens.push({
                type: "leftParen",
                value: "("
            });

            i++;

            continue;
        }

        if (char === ")") {

            tokens.push({
                type: "rightParen",
                value: ")"
            });

            i++;

            continue;
        }


        throw new Error(
            `Carácter no válido: ${char}`
        );
    }

    return tokens;
}


/* ============================================================
   PARSER MATEMÁTICO
============================================================ */

class Parser {

    constructor(tokens) {

        this.tokens = tokens;
        this.position = 0;
    }


    current() {
        return this.tokens[this.position];
    }


    consume() {
        return this.tokens[this.position++];
    }


    match(type, value = null) {

        const token = this.current();

        if (!token) {
            return false;
        }

        if (token.type !== type) {
            return false;
        }

        if (
            value !== null &&
            token.value !== value
        ) {
            return false;
        }

        this.position++;

        return true;
    }


    parse() {

        const value = this.parseExpression();

        if (this.position < this.tokens.length) {

            throw new Error(
                "Expresión inválida"
            );
        }

        return value;
    }


    /*
     * Suma y resta
     */
    parseExpression() {

        let value = this.parseTerm();

        while (true) {

            if (this.match("operator", "+")) {

                value += this.parseTerm();

            } else if (
                this.match("operator", "-")
            ) {

                value -= this.parseTerm();

            } else {

                break;
            }
        }

        return value;
    }


    /*
     * Multiplicación, división y módulo
     */
    parseTerm() {

        let value = this.parsePower();

        while (true) {

            if (this.match("operator", "*")) {

                value *= this.parsePower();

            } else if (
                this.match("operator", "/")
            ) {

                const divisor = this.parsePower();

                if (divisor === 0) {
                    throw new Error(
                        "No se puede dividir entre cero"
                    );
                }

                value /= divisor;

            } else if (
                this.match("operator", "mod")
            ) {

                const divisor = this.parsePower();

                if (divisor === 0) {
                    throw new Error(
                        "Módulo entre cero"
                    );
                }

                value %= divisor;

            } else {

                break;
            }
        }

        return value;
    }


    /*
     * Potencias
     */
    parsePower() {

        let value = this.parseUnary();

        if (this.match("operator", "^")) {

            const exponent = this.parsePower();

            value = Math.pow(value, exponent);
        }

        return value;
    }


    /*
     * Signos
     */
    parseUnary() {

        if (this.match("operator", "+")) {
            return +this.parseUnary();
        }

        if (this.match("operator", "-")) {
            return -this.parseUnary();
        }

        return this.parsePostfix();
    }


    /*
     * Factorial y porcentaje
     */
    parsePostfix() {

        let value = this.parsePrimary();

        while (true) {

            if (this.match("factorial")) {

                value = factorial(value);

            } else if (
                this.match("percent")
            ) {

                value /= 100;

            } else {

                break;
            }
        }

        return value;
    }


    /*
     * Números, constantes, funciones y paréntesis
     */
    parsePrimary() {

        const token = this.current();

        if (!token) {
            throw new Error(
                "Falta un valor"
            );
        }


        if (token.type === "number") {

            this.consume();

            return token.value;
        }


        if (
            token.type === "leftParen"
        ) {

            this.consume();

            const value =
                this.parseExpression();

            if (
                !this.match("rightParen")
            ) {

                throw new Error(
                    "Falta un paréntesis )"
                );
            }

            return value;
        }


        if (
            token.type === "function"
        ) {

            const functionName =
                token.value;

            this.consume();

            if (
                !this.match("leftParen")
            ) {

                throw new Error(
                    `La función ${functionName} necesita (`
                );
            }

            const argument =
                this.parseExpression();

            if (
                !this.match("rightParen")
            ) {

                throw new Error(
                    "Falta un paréntesis )"
                );
            }

            return applyFunction(
                functionName,
                argument
            );
        }


        throw new Error(
            "Valor inesperado"
        );
    }
}


/* ============================================================
   FUNCIONES CIENTÍFICAS
============================================================ */

function factorial(n) {

    if (!Number.isFinite(n)) {
        throw new Error("Factorial inválido");
    }

    if (n < 0 || !Number.isInteger(n)) {
        throw new Error(
            "El factorial requiere un entero positivo"
        );
    }

    if (n > 170) {
        throw new Error(
            "Factorial demasiado grande"
        );
    }

    let result = 1;

    for (let i = 2; i <= n; i++) {
        result *= i;
    }

    return result;
}


function toRadians(value) {

    return state.angleMode === "DEG"
        ? value * Math.PI / 180
        : value;
}


function fromRadians(value) {

    return state.angleMode === "DEG"
        ? value * 180 / Math.PI
        : value;
}


function applyFunction(name, value) {

    switch (name) {

        case "sin":
            return Math.sin(toRadians(value));

        case "cos":
            return Math.cos(toRadians(value));

        case "tan": {

            const radians = toRadians(value);

            if (
                Math.abs(Math.cos(radians)) < 1e-12
            ) {
                throw new Error(
                    "Tangente indefinida"
                );
            }

            return Math.tan(radians);
        }


        case "asin":

            if (value < -1 || value > 1) {
                throw new Error(
                    "asin requiere un valor entre -1 y 1"
                );
            }

            return fromRadians(
                Math.asin(value)
            );


        case "acos":

            if (value < -1 || value > 1) {
                throw new Error(
                    "acos requiere un valor entre -1 y 1"
                );
            }

            return fromRadians(
                Math.acos(value)
            );


        case "atan":

            return fromRadians(
                Math.atan(value)
            );


        case "sqrt":

            if (value < 0) {
                throw new Error(
                    "No existe raíz real de un número negativo"
                );
            }

            return Math.sqrt(value);


        case "log":

            if (value <= 0) {
                throw new Error(
                    "log requiere un valor positivo"
                );
            }

            return Math.log10(value);


        case "ln":

            if (value <= 0) {
                throw new Error(
                    "ln requiere un valor positivo"
                );
            }

            return Math.log(value);


        case "abs":

            return Math.abs(value);


        case "exp":

            return Math.exp(value);


        default:

            throw new Error(
                `Función desconocida: ${name}`
            );
    }
}


/* ============================================================
   PORCENTAJES
============================================================ */

/*
 * Casos:
 *
 * 200 + 10% = 220
 * 200 - 10% = 180
 * 200 × 10% = 20
 * 200 ÷ 10% = 2000
 *
 * Para + y -:
 *
 * 200 + (200 * 10 / 100)
 *
 * Para × y ÷:
 *
 * 200 * (10 / 100)
 */

function evaluateExpression(expression) {

    /*
     * Detectamos porcentajes binarios
     * de la forma:
     *
     * número operador número%
     */

    const match =
        expression.match(
            /^(-?\d+(?:\.\d+)?)\s*([+\-×÷*/])\s*(-?\d+(?:\.\d+)?)%$/
        );

    if (match) {

        const base = Number(match[1]);

        const operator = match[2];

        const percentage =
            Number(match[3]) / 100;


        if (operator === "+") {
            return base + base * percentage;
        }

        if (operator === "-") {
            return base - base * percentage;
        }

        if (
            operator === "×" ||
            operator === "*"
        ) {
            return base * percentage;
        }

        if (
            operator === "÷" ||
            operator === "/"
        ) {

            if (percentage === 0) {
                throw new Error(
                    "No se puede dividir entre cero"
                );
            }

            return base / percentage;
        }
    }


    const tokens =
        tokenize(expression);

    const parser =
        new Parser(tokens);

    return parser.parse();
}


/* ============================================================
   DISPLAY
============================================================ */

function updateDisplay() {

    expressionEl.textContent =
        state.expression || "0";

    resultEl.textContent =
        state.result;

    angleModeEl.textContent =
        state.angleMode;

    memoryIndicatorEl.classList.toggle(
        "visible",
        state.memory !== 0
    );
}


function showError(message) {

    state.error = true;

    resultEl.textContent = "Error";

    displayMessageEl.textContent =
        message;
}


function clearError() {

    if (!state.error) {
        return;
    }

    state.error = false;

    displayMessageEl.textContent = "";
}


/* ============================================================
   INPUT
============================================================ */

function appendValue(value) {

    clearError();

    if (state.justCalculated) {

        if (
            /^[0-9.]$/.test(value) ||
            value === "π" ||
            value === "e"
        ) {

            state.expression = "";
        }

        state.justCalculated = false;
    }


    /*
     * Evitar operadores duplicados
     */
    if (isOperator(value)) {

        if (!state.expression) {

            if (value === "-") {
                state.expression = "-";
            }

            updateDisplay();

            return;
        }

        const last =
            state.expression.slice(-1);

        if (isOperator(last)) {

            state.expression =
                state.expression.slice(0, -1) +
                value;

            updateDisplay();

            return;
        }
    }


    /*
     * Evitar puntos dobles dentro
     * del mismo número.
     */
    if (value === ".") {

        const currentNumber =
            state.expression
                .split(/[+\-×÷*/^()]/)
                .pop();

        if (currentNumber.includes(".")) {
            return;
        }
    }


    state.expression += value;

    updateDisplay();
}


/* ============================================================
   EVALUAR
============================================================ */

function calculate() {

    clearError();

    if (!state.expression) {
        return;
    }

    try {

        const expression =
            state.expression;

        const value =
            evaluateExpression(expression);

        const formatted =
            formatNumber(value);

        state.result =
            formatted;

        addHistory(
            expression,
            formatted
        );

        state.expression =
            formatted;

        state.justCalculated = true;

        updateDisplay();

    } catch (error) {

        showError(
            error.message ||
            "Expresión inválida"
        );
    }
}


/* ============================================================
   BORRADO
============================================================ */

function clearAll() {

    state.expression = "";
    state.result = "0";
    state.justCalculated = false;
    state.error = false;

    displayMessageEl.textContent = "";

    updateDisplay();
}


function clearEntry() {

    clearError();

    state.expression = "";

    state.result = "0";

    state.justCalculated = false;

    updateDisplay();
}


function backspace() {

    clearError();

    if (state.justCalculated) {

        state.expression = "";

        state.result = "0";

        state.justCalculated = false;

        updateDisplay();

        return;
    }

    state.expression =
        state.expression.slice(0, -1);

    if (!state.expression) {
        state.result = "0";
    }

    updateDisplay();
}


/* ============================================================
   CAMBIO DE SIGNO
============================================================ */

function toggleSign() {

    clearError();

    if (!state.expression) {
        state.expression = "-";
        updateDisplay();
        return;
    }


    /*
     * Si solamente tenemos un número:
     */
    if (
        /^-?\d+(?:\.\d+)?$/.test(
            state.expression
        )
    ) {

        state.expression =
            state.expression.startsWith("-")
                ? state.expression.slice(1)
                : "-" + state.expression;

        updateDisplay();

        return;
    }


    /*
     * Para expresiones complejas,
     * envolvemos toda la expresión.
     */
    state.expression =
        `-(${state.expression})`;

    updateDisplay();
}


/* ============================================================
   HISTORIAL
============================================================ */

function addHistory(
    expression,
    result
) {

    state.history.unshift({
        expression,
        result,
        time: new Date()
    });

    if (state.history.length > 50) {
        state.history.pop();
    }

    renderHistory();
}


function renderHistory() {

    historyList.innerHTML = "";

    historyCount.textContent =
        `${state.history.length} ${
            state.history.length === 1
                ? "operación"
                : "operaciones"
        }`;


    if (!state.history.length) {

        historyList.innerHTML = `
            <div class="empty-history">
                <span>◷</span>
                <p>No hay operaciones todavía</p>
            </div>
        `;

        return;
    }


    state.history.forEach(
        (item, index) => {

            const element =
                document.createElement("div");

            element.className =
                "history-item";

            const time =
                item.time.toLocaleTimeString(
                    "es-CO",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );

            element.innerHTML = `
                <div class="history-expression">
                    ${escapeHTML(item.expression)}
                </div>

                <div class="history-result">
                    = ${escapeHTML(item.result)}
                </div>

                <div class="history-time">
                    ${time}
                </div>
            `;


            element.addEventListener(
                "click",
                () => {

                    state.expression =
                        item.result;

                    state.result =
                        item.result;

                    state.justCalculated =
                        true;

                    updateDisplay();
                }
            );


            historyList.appendChild(element);
        }
    );
}


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}



function clearHistory() {

    if (!state.history.length) {
        return;
    }

    const items =
        historyList.querySelectorAll(".history-item");

    items.forEach((item, index) => {

        setTimeout(() => {
            item.classList.add("removing");
        }, index * 50);

    });

    /*
     * Esperamos a que termine la animación
     * antes de eliminar los datos.
     */
    setTimeout(() => {

        state.history = [];

        renderHistory();

        historyList.classList.add("clearing");

        setTimeout(() => {
            historyList.classList.remove("clearing");
        }, 150);

    }, items.length * 50 + 350);
}





/* ============================================================
   MEMORIA
============================================================ */

function getCurrentValue() {

    try {

        if (
            state.result &&
            state.result !== "Error"
        ) {

            return Number(
                state.result
            );
        }

        return evaluateExpression(
            state.expression
        );

    } catch {

        return 0;
    }
}


function memoryAction(action) {

    clearError();

    const value =
        getCurrentValue();


    switch (action) {

        case "MC":

            state.memory = 0;

            break;


        case "MR":

            state.expression =
                formatNumber(
                    state.memory
                );

            state.justCalculated =
                false;

            break;


        case "M+":

            state.memory += value;

            break;


        case "M-":

            state.memory -= value;

            break;


        case "MS":

            state.memory = value;

            break;
    }

    updateDisplay();
}


/* ============================================================
   FUNCIONES CIENTÍFICAS
============================================================ */

function insertScientific(value) {

    clearError();

    /*
     * Funciones que abren paréntesis
     */
    const functionsWithParenthesis = [
        "sin(",
        "cos(",
        "tan(",
        "asin(",
        "acos(",
        "atan(",
        "log(",
        "ln(",
        "sqrt(",
        "abs(",
        "exp("
    ];


    if (state.justCalculated) {

        if (
            functionsWithParenthesis.includes(
                value
            )
        ) {

            state.expression =
                value +
                state.result +
                ")";

            state.justCalculated =
                false;

            updateDisplay();

            return;
        }

        state.expression = "";

        state.justCalculated = false;
    }


    /*
     * Potencia 10^
     */
    if (value === "10^") {

        state.expression +=
            "10^";

        updateDisplay();

        return;
    }


    /*
     * x²
     */
    if (value === "^2") {

        if (!state.expression) {
            return;
        }

        state.expression += "^2";

        updateDisplay();

        return;
    }


    /*
     * Factorial
     */
    if (value === "!") {

        if (!state.expression) {
            return;
        }

        state.expression += "!";

        updateDisplay();

        return;
    }


    state.expression += value;

    updateDisplay();
}


/* ============================================================
   TEMA
============================================================ */

function toggleTheme() {

    document.body.classList.toggle(
        "dark"
    );

    const dark =
        document.body.classList.contains(
            "dark"
        );

    themeToggle.textContent =
        dark ? "☀" : "☾";

    localStorage.setItem(
        "calculatorTheme",
        dark ? "dark" : "light"
    );
}


function loadTheme() {

    const saved =
        localStorage.getItem(
            "calculatorTheme"
        );

    if (saved === "dark") {

        document.body.classList.add(
            "dark"
        );

        themeToggle.textContent = "☀";
    }
}


/* ============================================================
   MODO CIENTÍFICO
============================================================ */

function toggleScientific() {

    state.scientific =
        !state.scientific;

    scientificPanel.classList.toggle(
        "hidden",
        !state.scientific
    );

    scientificToggle.classList.toggle(
        "active",
        state.scientific
    );
}


/* ============================================================
   ÁNGULOS
============================================================ */

function toggleAngle() {

    state.angleMode =
        state.angleMode === "DEG"
            ? "RAD"
            : "DEG";

    angleToggle.textContent =
        state.angleMode;

    angleModeEl.textContent =
        state.angleMode;
}


/* ============================================================
   EVENTOS DE BOTONES
============================================================ */

document
    .querySelectorAll("[data-value]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const value =
                    button.dataset.value;

                if (
                    button.classList.contains(
                        "scientific-btn"
                    )
                ) {

                    insertScientific(value);

                } else if (value === "±") {

                    toggleSign();

                } else {

                    appendValue(value);
                }
            }
        );
    });


document
    .querySelectorAll("[data-memory]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                memoryAction(
                    button.dataset.memory
                );
            }
        );
    });


document
    .getElementById("equals")
    .addEventListener(
        "click",
        calculate
    );


document
    .getElementById("clearAll")
    .addEventListener(
        "click",
        clearAll
    );


document
    .getElementById("clearEntry")
    .addEventListener(
        "click",
        clearEntry
    );


document
    .getElementById("backspace")
    .addEventListener(
        "click",
        backspace
    );


document
    .getElementById("clearHistory")
    .addEventListener(
        "click",
        clearHistory
    );


scientificToggle.addEventListener(
    "click",
    toggleScientific
);


angleToggle.addEventListener(
    "click",
    toggleAngle
);


themeToggle.addEventListener(
    "click",
    toggleTheme
);


historyToggle.addEventListener(
    "click",
    () => {

        historyPanel.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }
);


/* ============================================================
   TECLADO
============================================================ */

document.addEventListener(
    "keydown",
    event => {

        const key =
            event.key;


        /*
         * No interferir con campos de texto.
         */
        if (
            event.target.tagName === "INPUT" ||
            event.target.tagName === "TEXTAREA"
        ) {
            return;
        }


        /*
         * Números
         */
        if (/^\d$/.test(key)) {

            appendValue(key);

            return;
        }


        /*
         * Decimal
         */
        if (key === ".") {

            appendValue(".");

            return;
        }


        /*
         * Operadores
         */
        if (
            key === "+" ||
            key === "-" ||
            key === "*" ||
            key === "/"
        ) {

            event.preventDefault();

            const operator =
                key === "*"
                    ? "×"
                    : key === "/"
                        ? "÷"
                        : key;

            appendValue(operator);

            return;
        }


        /*
         * Paréntesis
         */
        if (
            key === "(" ||
            key === ")"
        ) {

            appendValue(key);

            return;
        }


        /*
         * Porcentaje
         */
        if (key === "%") {

            appendValue("%");

            return;
        }


        /*
         * Enter
         */
        if (
            key === "Enter" ||
            key === "="
        ) {

            event.preventDefault();

            calculate();

            return;
        }


        /*
         * Backspace
         */
        if (key === "Backspace") {

            event.preventDefault();

            backspace();

            return;
        }


        /*
         * Escape
         */
        if (key === "Escape") {

            clearAll();

            return;
        }


        /*
         * Delete
         */
        if (key === "Delete") {

            clearEntry();
        }
    }
);


/* ============================================================
   INICIALIZACIÓN
============================================================ */

function initialize() {

    loadTheme();

    /*
     * El panel científico inicia visible.
     */
    scientificPanel.classList.remove(
        "hidden"
    );

    scientificToggle.classList.add(
        "active"
    );

    updateDisplay();

    renderHistory();
}


initialize();