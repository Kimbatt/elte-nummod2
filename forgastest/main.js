// ez a fő canvas, erre van rajzolva maga a függvény
const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");

// ez a másodlagos canvas, erre van rajzolva a szöveg és a tengelyekhez tartozó vonalak
const canvas2 = document.getElementById("coord-overlay");
const ctx2 = canvas2.getContext("2d");

// webgl canvas, erre van rajzolva a 3d-s modell
const canvas3d = document.getElementById("3d-view");
const ctx3d = canvas3d.getContext("webgl");

const stuffDiv = document.getElementById("stuff");

let aspectRatio = 1;
function Resized()
{
    // az ablak átméretezésénél a canvasokat is átméretezzük
    canvas.width = (window.innerWidth * 0.7) | 0;
    canvas.height = window.innerHeight - stuffDiv.clientHeight - 24;
    
    canvas2.width = (window.innerWidth * 0.7) | 0;
    canvas2.height = window.innerHeight - stuffDiv.clientHeight - 24;

    canvas3d.width = (window.innerWidth * 0.3) | 0;
    canvas3d.height = window.innerHeight - stuffDiv.clientHeight - 24;
    ctx3d.viewport(0, 0, canvas3d.width, canvas3d.height);
    aspectRatio = canvas3d.height / canvas3d.width;
    ctx3d.uniform1f(aspectRatioLoc, aspectRatio);

    ctx2.font = "40px Consolas";
    ctx2.fillStyle = "white";
    ctx2.strokeStyle = "white";
    ctx2.textBaseline = "bottom";
    ctx2.lineWidth = 2;
    Draw();
}

window.addEventListener("load", function()
{
    Setup();
    Resized();
});
window.addEventListener("resize", Resized);

window.oncontextmenu = () => false;

let zoomX = 100, zoomY = 100;
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

    // nagyításnál az egér pozíciójára nagyítunk
    const x = event.clientX, y = event.clientY - canvas.height * 0.5;
    cameraOffsetX = x - (x - cameraOffsetX) / prevZoomX * zoomX;
    cameraOffsetY = y - (y - cameraOffsetY) / prevZoomY * zoomY;
    Draw();
    DrawCoords();
});

// segédváltozó, akkor igaz ha mozgatjuk a kamerát
let mouseDown = false;

// a kamera pozícióját tároló változók
let cameraOffsetX = 0, cameraOffsetY = 0;
canvas2.addEventListener("mousedown", function(event)
{
    if (event.button === 2)
        mouseDown = true;
    else if (event.button === 0)
        AddNewPoint();
});
canvas2.addEventListener("mouseup", function(event)
{
    if (event.button === 2)
        mouseDown = false;
});
canvas2.addEventListener("mousemove", function(event)
{
    if (mouseDown)
    {
        // kamera mozgatása, ha le van nyomva a jobb egérgomb
        cameraOffsetX += event.movementX;
        cameraOffsetY += event.movementY;
        mouseCoordX = undefined;
        mouseCoordY = undefined;

        if (event.movementX !== 0 || event.movementY !== 0)
            Draw();
        
        ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
    }
    else
        DrawCoords();
});
canvas2.addEventListener("mouseleave", function()
{
    mouseCoordX = undefined;
    mouseCoordY = undefined;

    ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
});

// az oldal betöltésekor fut le ez a függvény, előkészíti a dolgokat
function Setup()
{
    Reset();
    cameraOffsetX = window.innerWidth * 0.1;
    cameraOffsetY = window.innerHeight * 0.3;
    WebglInit();
}

// ezekben a tömbökben lesznek tárolva a megadott pontok
let xCoords = [], yCoords = [];
let minPossibleX;

// az egyes kirajzolt pontok mérete
const size = 4;

// ez a függvény rajzolja ki a pontokat és a vonalakat
function DrawCoords()
{
    // koordináták kiszámolása
    mouseCoordX = Math.max(minPossibleX === undefined ? 0 : minPossibleX + 0.01, (event.clientX - cameraOffsetX) / zoomX);
    mouseCoordY = Math.max(0, (canvas2.height * 0.5 - event.clientY + cameraOffsetY) / zoomY);

    mousePosX = mouseCoordX * zoomX + cameraOffsetX;
    mousePosY = canvas2.height * 0.5 - mouseCoordY * zoomY + cameraOffsetY;

    ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
    ctx2.fillStyle = "#ffffff";
    ctx2.fillText("X: " + mouseCoordX.toFixed(2), mousePosX + 10, mousePosY - 10);
    ctx2.fillText("Y: " + mouseCoordY.toFixed(2), mousePosX + 10, mousePosY - 50);

    ctx2.fillStyle = "#00ff00";
    ctx2.beginPath();
    ctx2.arc(mousePosX, mousePosY, size, 0, Math.PI * 2);
    ctx2.fill();
}

let mouseCoordX, mouseCoordY, mousePosX, mousePosY;

// ez a függvény rajzolja ki a dolgokat
function Draw()
{
    const width = canvas.width;
    const height = canvas.height * 0.5;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height + cameraOffsetY);
    ctx.lineTo(width, height + cameraOffsetY);
    ctx.moveTo(cameraOffsetX, 0);
    ctx.lineTo(cameraOffsetX, height * 2);
    ctx.stroke();

    // felületek kirajzolása
    ctx.lineWidth = 4;
    ctx.fillStyle = "#0080ff";
    ctx.strokeStyle = "#80cfcf";
    const yZero = (height + cameraOffsetY) | 0;

    // kezdeti függőleges vonal
    if (xCoords.length > 0)
    {
        const x = (xCoords[0] * zoomX + cameraOffsetX) | 0;
        const y = (height - yCoords[0] * zoomY + cameraOffsetY) | 0;
        ctx.beginPath();
        ctx.moveTo(x, yZero);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    for (let i = 1; i < xCoords.length; ++i)
    {
        const prevX = (xCoords[i - 1] * zoomX + cameraOffsetX) | 0,
              prevY = (height - yCoords[i - 1] * zoomY + cameraOffsetY) | 0,
              currentX = (xCoords[i] * zoomX + cameraOffsetX) | 0,
              currentY = (height - yCoords[i] * zoomY + cameraOffsetY) | 0;

        // a terület / "integrál" kirajzolása
        ctx.beginPath();
        ctx.moveTo(prevX, yZero);
        ctx.lineTo(prevX, prevY);
        ctx.lineTo(currentX, currentY);
        ctx.lineTo(currentX, yZero);
        ctx.closePath();
        ctx.fill();
        
        // ez a felület a pohár széle
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
    }
    
    // pontok kirajzolása
    ctx.fillStyle = "#80cfcf";
    for (let i = 0; i < xCoords.length; ++i)
    {
        ctx.beginPath();
        ctx.arc((xCoords[i] * zoomX + cameraOffsetX) | 0, (height - yCoords[i] * zoomY + cameraOffsetY) | 0, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// rajzolás újrakezdése
function Reset()
{
    xCoords = [];
    yCoords = [];
    minPossibleX = undefined;
    Draw();
    
    document.getElementById("volume-div").innerText = "Térfogat: 0 egység³";
    document.getElementById("area-div").innerText = "Felszín: 0 egység²";

    if (vertices.length !== 0)
    {
        vertices = [];
        ctx3d.bindBuffer(ctx3d.ARRAY_BUFFER, vertexBuffer);
        ctx3d.bufferData(ctx3d.ARRAY_BUFFER, new Float32Array(vertices), ctx3d.STATIC_DRAW);
    }
}

let volume = 0;
let area = 0;
let vertices = [];
function AddNewPoint()
{
    xCoords.push(mouseCoordX);
    yCoords.push(mouseCoordY);
    minPossibleX = mouseCoordX;
    Draw();
    DrawCoords();

    volume = 0;
    area = 0;
    if (xCoords.length > 1)
    {
        for (let i = 1; i < xCoords.length; ++i)
        {
            const prevX = xCoords[i - 1], prevY = yCoords[i - 1], currentX = xCoords[i], currentY = yCoords[i];

            // trapéz területe
            volume += (prevY * prevY + currentY * currentY) * (currentX - prevX) * 0.5;

            const derivative = (currentY - prevY) / (currentX - prevX);
            area += Math.sqrt(1 + derivative * derivative) * (currentX - prevX);
        }

        volume *= Math.PI;
        area *= Math.PI * 2;
    }

    // a pohár aljának a felszíne
    area += yCoords[0] * yCoords[0] * Math.PI;

    document.getElementById("volume-div").innerText = "Térfogat: " + volume.toFixed(2) + " egység³";
    document.getElementById("area-div").innerText = "Felszín: " + area.toFixed(2) + " egység²";
    
    // webgl 3d rajzolás rész

    vertices = [];
    // pohár alja
    const bottomX = xCoords[0], bottomY = yCoords[0];
    for (let i = 0; i < segments; ++i)
    {
        const angle = i / segments * Math.PI * 2;
        const nextAngle = ((i + 1) % segments) / segments * Math.PI * 2;

        vertices.push(0);
        vertices.push(0);
        vertices.push(bottomX);

        vertices.push(bottomY * Math.cos(angle));
        vertices.push(bottomY * Math.sin(angle));
        vertices.push(bottomX);
        
        vertices.push(bottomY * Math.cos(nextAngle));
        vertices.push(bottomY * Math.sin(nextAngle));
        vertices.push(bottomX);
    }

    // a többi rész
    for (let i = 1; i < xCoords.length; ++i)
    {
        const prevX = xCoords[i - 1], prevY = yCoords[i - 1], currentX = xCoords[i], currentY = yCoords[i];
        for (let j = 0; j < segments; ++j)
        {
            const angle = j / segments * Math.PI * 2;
            const nextAngle = ((j + 1) % segments) / segments * Math.PI * 2;

            vertices.push(prevY * Math.cos(angle));
            vertices.push(prevY * Math.sin(angle));
            vertices.push(prevX);

            vertices.push(currentY * Math.cos(angle));
            vertices.push(currentY * Math.sin(angle));
            vertices.push(currentX);

            vertices.push(currentY * Math.cos(nextAngle));
            vertices.push(currentY * Math.sin(nextAngle));
            vertices.push(currentX);
            
            vertices.push(prevY * Math.cos(angle));
            vertices.push(prevY * Math.sin(angle));
            vertices.push(prevX);

            vertices.push(currentY * Math.cos(nextAngle));
            vertices.push(currentY * Math.sin(nextAngle));
            vertices.push(currentX);
            
            vertices.push(prevY * Math.cos(nextAngle));
            vertices.push(prevY * Math.sin(nextAngle));
            vertices.push(prevX);
        }
    }

    ctx3d.bindBuffer(ctx3d.ARRAY_BUFFER, vertexBuffer);
    const verticesFloat32Array = new Float32Array(vertices);
    ctx3d.bufferData(ctx3d.ARRAY_BUFFER, verticesFloat32Array, ctx3d.STATIC_DRAW);

    ctx3d.uniform1f(xOffsetLoc, -(xCoords[0] + xCoords[xCoords.length - 1]) * 0.5);
}

let webglProgram;
let vertexBuffer, vertexLoc;
let timeLoc, aspectRatioLoc, xOffsetLoc;
function WebglInit()
{
    const vertexShader = `
    attribute vec3 aVertex;
    uniform float uTime;
    uniform float uAspect;
    uniform float xOffset;
    varying float alphaValue;

    void main()
    {
        float cos1 = cos(uTime);
        float cos2 = cos(uTime * 0.618);
        float sin1 = sin(uTime);
        float sin2 = sin(uTime * 0.618);

        float vx = aVertex.x;
        float vy = aVertex.y;
        float vz = aVertex.z + xOffset;

        float x = vx * cos2 + vz * sin2;
        float y = sin1 * sin2 * vx + cos1 * vy - cos2 * sin1 * vz;
        float z = sin1 * vy;
        
        gl_Position = vec4(x * 0.1 * uAspect, y * 0.1, z * 0.1, 1.0);
        alphaValue = (z - 1.0) * 0.1 + 0.5;
    }
    `;

    const fragmentShader = `
    precision mediump float;
    varying float alphaValue;
    void main()
    {
        gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0 - alphaValue);
    }
    `;

    ctx3d.enable(ctx3d.BLEND);
    ctx3d.blendFunc(ctx3d.SRC_ALPHA, ctx3d.ONE_MINUS_SRC_ALPHA);

    ctx3d.clearColor(0.1, 0.1, 0.1, 1);

    // webgl shaderek inicializálása
    const vertShaderObj = ctx3d.createShader(ctx3d.VERTEX_SHADER);
    const fragShaderObj = ctx3d.createShader(ctx3d.FRAGMENT_SHADER);
    ctx3d.shaderSource(vertShaderObj, vertexShader);
    ctx3d.shaderSource(fragShaderObj, fragmentShader);
    ctx3d.compileShader(vertShaderObj);
    ctx3d.compileShader(fragShaderObj);

    //console.log(ctx3d.getShaderInfoLog(vertShaderObj));
    //console.log(ctx3d.getShaderInfoLog(fragShaderObj));
    
    webglProgram = ctx3d.createProgram();
    ctx3d.attachShader(webglProgram, vertShaderObj);
    ctx3d.attachShader(webglProgram, fragShaderObj);
    ctx3d.linkProgram(webglProgram);
    ctx3d.useProgram(webglProgram);
    
    vertexBuffer = ctx3d.createBuffer();
    vertexLoc = ctx3d.getAttribLocation(webglProgram, "aVertex");
    timeLoc = ctx3d.getUniformLocation(webglProgram, "uTime");
    aspectRatioLoc = ctx3d.getUniformLocation(webglProgram, "uAspect");
    xOffsetLoc = ctx3d.getUniformLocation(webglProgram, "xOffset");

    window.requestAnimationFrame(Draw3d);
}

const segments = 50;
function Draw3d()
{
    ctx3d.clear(ctx3d.COLOR_BUFFER_BIT);
    if (vertices.length === 0)
    {
        window.requestAnimationFrame(Draw3d);
        return;
    }

    ctx3d.clear(ctx3d.COLOR_BUFFER_BIT);

    ctx3d.uniform1f(timeLoc, performance.now() * 0.001);

    ctx3d.enableVertexAttribArray(vertexLoc);
    ctx3d.bindBuffer(ctx3d.ARRAY_BUFFER, vertexBuffer);
    ctx3d.vertexAttribPointer(vertexLoc, 3, ctx3d.FLOAT, false, 0, 0);

    ctx3d.drawArrays(ctx3d.TRIANGLES, 0, vertices.length / 3);

    window.requestAnimationFrame(Draw3d);
}