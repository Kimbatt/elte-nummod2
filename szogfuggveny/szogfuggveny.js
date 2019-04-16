
let evaluateFunction;

// ez a függvény számolja ki kezdetben az értékeket, Fejér-Hermite interpolációval
function Setup()
{
    let xValues =    [0, Math.PI / 6,      Math.PI / 4,      Math.PI / 3,      Math.PI / 2];
    let fxValues =   [0, 0.5,              Math.sqrt(2) / 2, Math.sqrt(3) / 2, 1          ];
    let fxdxValues = [1, Math.sqrt(3) / 2, Math.sqrt(2) / 2, 0.5,              0          ];

    let osztottDifferenciak = [];

    // osztott differenciákhoz tartozó x értékek
    osztottDifferenciaX = [xValues[0], xValues[0], xValues[1], xValues[1], xValues[2], xValues[2], xValues[3], xValues[3], xValues[4], xValues[4]];

    // első osztott differenciák, tehát f(x) értékek
    osztottDifferenciak.push([fxValues[0], fxValues[0], fxValues[1], fxValues[1], fxValues[2], fxValues[2], fxValues[3], fxValues[3], fxValues[4], fxValues[4]]);

    // minden pontnak 2 a multiplicitása
    let osztottDifferenciaCount = xValues.length * 2;

    // osztott differenciák kiszámolása
    for (let i = 1; i < osztottDifferenciaCount; ++i)
    {
        let elozoOsztottDifferenciak = osztottDifferenciak[i - 1];
        let jelenlegiOsztottDifferenciak = [];
        for (let j = 0; j < osztottDifferenciaCount - i; ++j)
        {
            let startXIndex = j;
            let endXIndex = j + i;

            let value;

            let startXValue = osztottDifferenciaX[startXIndex];
            let endXValue = osztottDifferenciaX[endXIndex];

            if (startXValue === endXValue) // azonos alappontok
            {
                // mivel minden pont multiplicitása 2, ezért a startXIndex/2 indexen lesz a derivált érték

                value = fxdxValues[(startXIndex / 2) | 0]; // még osztani kéne a megfelelő faktoriálissal, de mivel csak első deriváltak vannak, ezért itt nem kell
            }
            else // különböző alappontok
            {
                value = (elozoOsztottDifferenciak[startXIndex + 1] - elozoOsztottDifferenciak[startXIndex])
                        / (osztottDifferenciaX[endXIndex] - osztottDifferenciaX[startXIndex]);
            }

            jelenlegiOsztottDifferenciak.push(value);
        }

        osztottDifferenciak.push(jelenlegiOsztottDifferenciak);
    }

    // együtthatók
    let coefficients = [];
    for (let i = 0; i < osztottDifferenciaCount; ++i)
        coefficients.push(osztottDifferenciak[i][0]);
    
    // kiszámoló függvény létrehozása
    evaluateFunction = function(x)
    {
        let returnValue = coefficients[osztottDifferenciaCount - 1];
        for (let i = osztottDifferenciaCount - 2; i >= 0; --i)
        {
            returnValue *= x - osztottDifferenciaX[i];
            returnValue += coefficients[i];
        }

        return returnValue;
    }
}

// közelítő sin értéket kiszámító függvény
function SinValue(number)
{
    let xValue = number % (Math.PI * 2);
    
    if (xValue < 0)
        xValue += Math.PI * 2;
    
    // melyik síknegyedbe esik a megadott érték
    let quarter = (xValue / (Math.PI / 2)) | 0;

    switch (quarter)
    {
        case 0:
            return evaluateFunction(xValue);
        case 1:
            return evaluateFunction(Math.PI - xValue);
        case 2:
            return -evaluateFunction(xValue - Math.PI);
        case 3:
            return -evaluateFunction(Math.PI * 2 - xValue);
    }

}

// közelítő cos értéket kiszámító függvény
function CosValue(number)
{
    // cos(x) = sin(PI/2 - x)
    return SinValue(Math.PI / 2 - number);
}

function Changed(input)
{
    if (!input.validity.valid)
        return;

    let inputValue = Number(input.value);

    if (isNaN(inputValue))
        return;

    let sinValue = SinValue(inputValue);
    let cosValue = CosValue(inputValue);

    document.getElementById("sin").innerHTML = sinValue;
    document.getElementById("cos").innerHTML = cosValue;

    let actualSinValue = Math.sin(inputValue), actualCosValue = Math.cos(inputValue);
    document.getElementById("sin-actual").innerHTML = actualSinValue;
    document.getElementById("cos-actual").innerHTML = actualCosValue;
    
    let sinValueError = Math.abs(actualSinValue - sinValue), cosValueError = Math.abs(actualCosValue - cosValue);
    document.getElementById("sin-error").innerHTML = sinValueError;
    document.getElementById("cos-error").innerHTML = cosValueError;
}

Setup();