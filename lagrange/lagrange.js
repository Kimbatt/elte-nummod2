// ez a fő canvas, erre van rajzolva maga a függvény
const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");

// ez a másodlagos canvas, erre van rajzolva a szöveg és a tengelyekhez tartozó vonalak
const canvas2 = document.getElementById("coord-overlay");
const ctx2 = canvas2.getContext("2d");

const stuffDiv = document.getElementById("stuff");

function Resized()
{
    // az ablak átméretezésénél a canvasokat is átméretezzük
    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight - stuffDiv.clientHeight - 24;
    
    canvas2.width = document.documentElement.clientWidth;
    canvas2.height = document.documentElement.clientHeight - stuffDiv.clientHeight - 24;

    ctx2.font = "40px Consolas";
    ctx2.fillStyle = "white";
    ctx2.strokeStyle = "white";
    ctx2.textBaseline = "bottom";
    ctx2.lineWidth = 2;
    Calculate();
}

window.addEventListener("load", function()
{
    Setup();
    Resized();
});
window.addEventListener("resize", Resized);

let zoomX = 40, zoomY = 40;
window.addEventListener("wheel", function(event)
{
    // egérgörgővel nagyítás / kicsinyítés
    let prevZoomX = zoomX, prevZoomY = zoomY;
    if (event.deltaY < 0)
    {
        if (!event.shiftKey)
            zoomX *= 1.1;
        
        if (!event.altKey)
            zoomY *= 1.1;
    }
    else
    {
        if (!event.shiftKey)
            zoomX /= 1.1;
        
        if (!event.altKey)
            zoomY /= 1.1;
    }

    // ennek a kódrészletnek az a feladata, hogy nagyításnál az egér pozíciójára nagyítsunk
    const x = event.clientX, y = event.clientY - canvas.height * 0.5;
    cameraOffsetX = x - (x - cameraOffsetX) / prevZoomX * zoomX;
    cameraOffsetY = y - (y - cameraOffsetY) / prevZoomY * zoomY;
    Calculate();
});

// segédváltozó, akkor igaz ha mozgatjuk a kamerát
let mouseDown = false;

// a kamera pozícióját tároló változók
let cameraOffsetX = 0, cameraOffsetY = 0;
canvas2.addEventListener("mousedown", function(event)
{
    if (event.button === 0)
        mouseDown = true;
});
canvas2.addEventListener("mouseup", function(event)
{
    if (event.button === 0)
        mouseDown = false;
});
canvas2.addEventListener("mousemove", function(event)
{
    if (mouseDown)
    {
        // kamera mozgatása, ha le van nyomva a bal egérgomb
        cameraOffsetX += event.movementX;
        cameraOffsetY += event.movementY;
        mouseCoordX = undefined;
        mouseCoordY = undefined;

        if (event.movementX !== 0 || event.movementY !== 0)
            Calculate();
        
        ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
    }
    else
    {
        // koordináták kiszámolása, ha nincs lenyomva
        mousePosX = event.clientX;
        mousePosY = event.clientY;
        mouseCoordX = (mousePosX - cameraOffsetX) / zoomX;
        mouseCoordY = polynomialFunction(mouseCoordX);
        DrawCoords();
    }
});
canvas2.addEventListener("mouseleave", function()
{
    mouseCoordX = undefined;
    mouseCoordY = undefined;

    ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
});

// ez a függvény hozzáad új mezőket amibe be lehet írni az X és Y koordinátákat
function AddInput(x, y)
{
    let xCoordsDiv = document.getElementById("x-coords");
    let yCoordsDiv = document.getElementById("y-coords");

    let xInput = document.createElement("input");
    xInput.type = "number";
    xInput.value = x;
    xInput.step = 0.01;
    xInput.oninput = InputChanged;
    xCoordsDiv.appendChild(xInput);
    
    let yInput = document.createElement("input");
    yInput.type = "number";
    yInput.value = y;
    yInput.step = 0.01;
    yInput.oninput = InputChanged;
    yCoordsDiv.appendChild(yInput);
}

// az oldal betöltésekor fut le ez a függvény, előkészíti a dolgokat
function Setup()
{
    cameraOffsetX = document.documentElement.clientWidth * 0.25;
    AddInput(0, 0);
    AddInput(1, 1);
    AddInput(4, 2);
    AddInput(9, 3);
    AddInput(16, 4);
    AddInput();
}

let error = false;
// ez a függvény ellenőrzi le, hogy a beírt adatok érvényesek-e
function InputChanged()
{
    let xCoordsDiv = document.getElementById("x-coords").children;
    let yCoordsDiv = document.getElementById("y-coords").children;

    let hasEmptyOrInvalidInput = false;
    error = false;
    let emptyColumnCount = 0;
    let deleteThisNodeX = undefined, deleteThisNodeY = undefined;

    // eltároljuk az X helyeket, ha egy hely többször szerepel, akkor hibát jelzünk
    let xValues = new Set();
    for (let i = 0; i < xCoordsDiv.length; ++i)
    {
        let xElement = xCoordsDiv[i];

        if (!xElement.validity.valid || xElement.value === "")
            hasEmptyOrInvalidInput = true;
        else
        {
            let xNumberValue = Number(xElement.value);
            if (xValues.has(xNumberValue))
            {
                let errorTextDiv = document.getElementById("error-text");
                errorTextDiv.innerHTML = "Már létezik érték a(z) " + xNumberValue + " helyen!";
                errorTextDiv.style.visibility = "visible";
                return;
            }

            xValues.add(xNumberValue);
        }

        xValues.add(xElement.value);

        let yElement = yCoordsDiv[i];

        if (!yElement.validity.valid || yElement.value === "")
            hasEmptyOrInvalidInput = true;

        if (xElement.validity.valid && xElement.value === "" && yElement.validity.valid && yElement.value === "")
        {
            // ha 2 üres mező is van, akkor az egyiket töröljük
            if (++emptyColumnCount === 2)
            {
                deleteThisNodeX = xElement;
                deleteThisNodeY = yElement;
            }
        }

        if (!xElement.validity.valid || !yElement.validity.valid)
            error = true;
    }

    if (error)
        return;

    // ha kell, akkor új mezőt adunk hozzá
    if (!hasEmptyOrInvalidInput && emptyColumnCount === 0)
        AddInput();
    else
    {
        if (deleteThisNodeX)
            document.getElementById("x-coords").removeChild(deleteThisNodeX);

        if (deleteThisNodeY)
            document.getElementById("y-coords").removeChild(deleteThisNodeY);
    }

    document.getElementById("error-text").style.visibility = "hidden";

    // ha minden helyes, akkor kiszámolhatjuk a polinomot
    Calculate();
}

// ez lesz az a függvény, ami adott X pontban megadja a polinom helyettesítési értékét
let polynomialFunction;

// ezekben a tömbökben lesznek tárolva a megadott pontok
let xCoords, yCoords;

// ez a függvény kiszámolja a dolgokat
function Calculate()
{
    if (error)
        return;

    xCoords = [];
    yCoords = [];

    let xCoordsDiv = document.getElementById("x-coords").children;
    let yCoordsDiv = document.getElementById("y-coords").children;

    let count = 0;
    for (let i = 0; i < xCoordsDiv.length; ++i)
    {
        let xValue = xCoordsDiv[i].value;
        let yValue = yCoordsDiv[i].value;

        if (xValue === "" || yValue === "")
            continue;

        xCoords.push(Number(xValue));
        yCoords.push(Number(yValue));
        ++count;
    }

    polynomialFunction = function(x)
    {
        // itt történik az interpolációs polinom kiszámítása
        let value = 0;
        for (let i = 0; i < count; ++i)
        {
            let currentY = yCoords[i];
            let currentXValues = 1;
            for (let j = 0; j < count; ++j)
            {
                if (i === j)
                    continue;

                let currentX = xCoords[j];
                currentXValues *= (x - currentX) / (xCoords[i] - currentX);
            }

            value += currentY * currentXValues;
        }

        return value;
    };

    Draw();
}

// ez a függvény rajzolja ki a koordinátákat és a tengelyekhez a vonalakat
function DrawCoords()
{
    ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
    ctx2.fillText("X: " + mouseCoordX.toFixed(2), mousePosX + 10, mousePosY - 10);
    ctx2.fillText("Y: " + mouseCoordY.toFixed(2), mousePosX + 10, mousePosY - 50);

    let zero = canvas2.height * 0.5 + cameraOffsetY;
    let value = zero - mouseCoordY * zoomY;
    let xZero = cameraOffsetX;
    
    ctx2.beginPath();
    ctx2.moveTo(mousePosX, Math.max(0, zero));
    ctx2.lineTo(mousePosX, Math.min(canvas2.height, value));

    ctx2.lineTo(Math.max(0, xZero), value);
    ctx2.stroke();
}

let mouseCoordX, mouseCoordY, mousePosX, mousePosY;

// ez a függvény rajzolja ki a polinomot
function Draw()
{
    const width = canvas.width;
    const height = canvas.height * 0.5;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height - 1 + cameraOffsetY);
    ctx.lineTo(width, height + 1 + cameraOffsetY);
    ctx.moveTo(cameraOffsetX - 1, 0);
    ctx.lineTo(cameraOffsetX + 2, height * 2);
    ctx.stroke();

    ctx.fillStyle = "red";

    // az egyes kirajzolt pontok mérete
    const size = 2;

    // ha ezt a változót kisebbre vesszük, akkor növelhető a pontossága a kirajzolásnak
    const precision = 1;

    for (let i = 0; i < width; i += precision)
    {
        let x = (i - cameraOffsetX) / zoomX;
        ctx.fillRect(i - size, height - polynomialFunction(x) * zoomY + cameraOffsetY - size, size * 2, size * 2);
    }

    ctx.fillStyle = "cyan";
    for (let i = 0; i < xCoords.length; ++i)
    {
        ctx.beginPath();
        ctx.arc(xCoords[i] * zoomX + cameraOffsetX, height -yCoords[i] * zoomY + cameraOffsetY, size * 2, 0, Math.PI * 2);
        ctx.fill();
    }

    if (mouseCoordX !== undefined && mouseCoordY !== undefined)
        DrawCoords();
}
