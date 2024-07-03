
CREATE TABLE users (
    id VARCHAR(100) NOT NULL,
    nombre VARCHAR(100),
    email VARCHAR(200) NOT NULL,
    celular VARCHAR(50),
    rut VARCHAR(100),
    fecha_de_nacimiento DATE,
    activo BOOLEAN NOT NULL,
    password VARCHAR(100) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE plans(
    id VARCHAR(100) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    monthly_price FLOAT,
    annual_price FLOAT,
    PRIMARY KEY (id)
);

CREATE TABLE clicks(
    id INT NOT NULL,
    email INT,
    formulario INT,
    plan_mensual INT,
    plan_anual INT,
    pagar_anual INT,
    pagar_mensual INT,
    PRIMARY KEY (id)
);

CREATE TABLE suscriptions (
    id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    plan_id VARCHAR(100) NOT NULL,
    mercadopago_plan_id VARCHAR(100),
    plan_type VARCHAR(20),
    start_date DATE NOT NULL,
    end_date DATE,
    billing_day INT,
    next_payment_date DATE,
    status VARCHAR(30),
    PRIMARY KEY (id),
    KEY users(user_id),
    KEY plans(plan_id)
);

CREATE TABLE pays (
    id VARCHAR(100) NOT NULL,
    suscription_id VARCHAR(100) NOT NULL,
    transaction_amount FLOAT,
    status VARCHAR(20), /* "APRO"/"PEN"/"REJ" */
    date DATE,
    PRIMARY KEY (id),
    KEY suscriptions(suscription_id)
);


INSERT INTO plans ( id, nombre, monthly_price, annual_price ) VALUES ("2c9380849007280c01900cdc44590196", "Plan", 9900, 99000);
