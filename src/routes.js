import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { Router } from "express";
import { v4 as uuidv4 } from 'uuid';
import { io } from "../index.js";
import jwt from 'jsonwebtoken';
import 'dotenv/config.js'
import { Preference, MercadoPagoConfig, Payment } from "mercadopago";
import { sendEmailBienvenida, sendEmailCode } from "./emailSender.js";
import bcrypt from 'bcrypt';

//real:
const client = new MercadoPagoConfig({accessToken: 'APP_USR-8569095405415862-061210-47ee8cd18ddac21a3e787d065de456c1-782640045'})
//test:
//const client = new MercadoPagoConfig({accessToken: 'APP_USR-6042457912670930-061210-8ca40ae15924091738f5f364d8383ee6-1853466315'})

const prisma = new PrismaClient();

const router = Router();


router.get('/',async(req,res)=>{
  res.send('hola')
})

router.get('/test',async(req,res)=>{
  res.status(200).send('hola')
})

router.post('/create-suscription',async(req,res)=>{
    const { token, nombre, email, celular, rut, password,user_id,fecha_de_nacimiento } = req.body;

    console.log('body')
    console.log(req.body)
    //prueba real de la real
    const plan = "2c9380849007284d0190323d5e150bba"
    //prueba real
    //const plan = "2c9380849007280c01902bd1a0000998";
    //prueba tester
    //const plan = "2c9380849007280c01900cdc44590196";

    //type: monthly

    const data = {
      preapproval_plan_id: plan,
      payer_email: req.body.payer.email,
      //payer_email: "test_user_422112672@testuser.com",
      card_token_id: token,
      //status: "authorized", 
    }

    if(token) {
      const suscripcion = await generar_suscripcion(data); 
      if(suscripcion){
        if(suscripcion.data.status === "authorized"){
  
          //const user_id = uuidv4()
          const suscription_id = uuidv4();
          
          const pay_id = uuidv4();

          const passHashed = bcrypt.hashSync(password,bcrypt.genSaltSync(10));
  
          const user_data = { 
            id: user_id , 
            nombre, 
            email, 
            celular, 
            rut, 
            fecha_de_nacimiento, 
            activo:true, 
            password: passHashed
          }
    
          const suscription_data = { 
            id: suscription_id, 
            user_id: user_id , 
            plan_id: plan, 
            mercadopago_plan_id: `${suscripcion.data.id}`, 
            plan_type: "monthly", 
            start_date: suscripcion.data.auto_recurring.start_date,
            end_date: suscripcion.data.auto_recurring.end_date,
            billing_day: suscripcion.data.auto_recurring.billing_day,
            status: "Active",
            //next_payment_date: suscripcion.data.next_payment_date
          }
    
  
          const pay_data = { 
            id:pay_id, 
            suscription_id:suscription_id,  
            transaction_amount:suscripcion.data.auto_recurring.transaction_amount,
            status: "APRO", 
            date:suscripcion.data.date_created 
          }
          const response = await register_data(user_data, suscription_data, pay_data)
          if(response.ok === true){
            
            const dataTKN = {
              user: {...user_data,pass: password},
              plan: [
                {
                  plan_type: "monthly",
                  start_date: suscription_data.start_date,
                  status: suscription_data.status,
                  mercadopago_plan_id: suscription_data.mercadopago_plan_id,
                  monthly_price: 9900,
                  annual_price: 99000,
                  nombre: "Plan"
                }
              ],
              pagos: [
                {
                  transaction_amount: pay_data.transaction_amount,
                  status: pay_data.status,
                  date: pay_data.date
                }
              ]

            };
            
            const token = jwt.sign(dataTKN, "SECRET_KEY")
            await sendEmailBienvenida(email);
            io.emit(`pago_suscripcion_${user_id}`,{status:"APRO", tkn:token})
          }else{
            io.emit(`pago_suscripcion_${user_id}`,{status:"REJ"})
          }
        }else{
          io.emit(`pago_suscripcion_${user_id}`,{status:"REJ"})
        }
      }else{
        io.emit(`pago_suscripcion_${user_id}`,{status:"REJ"})
      }
    }
  
    return res.status(200).send("OK")
})
  
const generar_suscripcion = async(data) => {
    try{
      const response = await axios.post(
        "https://api.mercadopago.com/preapproval",
        data,
        {
          headers: {
            Authorization: 'Bearer APP_USR-8569095405415862-061210-47ee8cd18ddac21a3e787d065de456c1-782640045',
            //test:
            //Authorization: 'Bearer APP_USR-6042457912670930-061210-8ca40ae15924091738f5f364d8383ee6-1853466315',
          },
        }
      )
      console.log('respuesta de la suscripcion')
      console.log(response)
      return response
    }catch(err){
      console.log('error en la suscripcion')
      console.log(err)
      return null
    }
}


router.post('/crear-order', async(req,res)=>{
  const { nombre, email, celular, rut, password,user_id,fecha_de_nacimiento, mobile } = req.body;
  //const fecha_de_nacimiento = "1999-06-14T11:21:59.000-04:00";
  
  try{
    

    let body = {
      items : [{
        title : 'Plan Anual',
        quantity : 1,
        unit_price : 99000,
        currency_id : 'CLP'
 
      }],
      
      //notification_url: `https://7204-181-91-208-141.ngrok-free.app/webhook/${nombre.trim().replace(/\s+/g, "-")}/${email}/${celular}/${rut}/${password}/${user_id}/${fecha_de_nacimiento}`
      notification_url: `https://rifa-club-production.up.railway.app/webhook/${nombre.trim().replace(/\s+/g, "-")}/${email}/${celular}/${rut}/${password}/${user_id}/${fecha_de_nacimiento}`

    };

    let redirecions = {
      back_urls: {
        success: "https://rifa-club.netlify.app/",
        failure: "https://rifa-club.netlify.app/",
        pending: "https://rifa-club.netlify.app/"
      },
      auto_return: "approved",
    }

    
    mobile === true ? body = {...body, ...redirecions} : body = body
    console.log(body)

    const preference = new Preference(client);
    const result = await preference.create({body});
    return res.status(200).json({init_point: result.init_point})
  }catch(err){
    return res.status(400).json({message:err})
  }
})



router.post('/webhook/:nombre/:email/:celular/:rut/:password/:user_id/:fecha_de_nacimiento',async(req,res)=>{
  const { query } = req;
  const topic = query.topic || query.type;

  const nombre = req.params.nombre.replace(/-/g, " ")
  const email = req.params.email;
  const celular = req.params.celular; 
  const rut = req.params.rut;
  const password = req.params.password;
  const user_id = req.params.user_id
  const fecha_de_nacimiento = req.params.fecha_de_nacimiento

  
  if(topic === "payment"){
    
    const paymentId = query.id || query["data.id"];
    try{
      const payment = await new Payment(client).get({id: paymentId});
      console.log(payment)
      if(payment.status === "approved"){

        const suscription_id = uuidv4();
        //plan real:
        const plan = "2c9380849007284d0190323d5e150bba";
        //plan tester:
        //const plan = "2c9380849007280c01900cdc44590196";

        const passHashed = bcrypt.hashSync(password,bcrypt.genSaltSync(10));

        const user_data = { 
          id: user_id , 
          nombre, 
          email, 
          celular, 
          rut, 
          fecha_de_nacimiento, 
          activo:true, 
          password: passHashed
        }
  
        const suscription_data = { 
          id: suscription_id, 
          user_id: user_id , 
          plan_id: plan, 
          mercadopago_plan_id: null, 
          plan_type: "annual", 
          start_date: payment.date_created,
          end_date: null,
          billing_day: null,
          status: "Active",
        }

        const pay_data = { 
          id: paymentId, 
          suscription_id:suscription_id,  
          transaction_amount: payment.transaction_amount,
          status: "APRO", 
          date: payment.date_created
        }

        const response = await register_data(user_data, suscription_data, pay_data)


        if(response.ok === true){

          const dataTKN = {
            user: {...user_data,pass:password},
            plan: [
              {
                plan_type: "annual",
                start_date: suscription_data.start_date,
                status: suscription_data.status,
                mercadopago_plan_id: suscription_data.mercadopago_plan_id,
                monthly_price: 9900,
                annual_price: 99000,
                nombre: "Plan"
              }
            ],
            pagos: [
              {
                transaction_amount: pay_data.transaction_amount,
                status: pay_data.status,
                date: pay_data.date
              }
            ]

          };
          
          const token = jwt.sign(dataTKN, "SECRET_KEY")
          await sendEmailBienvenida(email);

          io.emit(`pago_suscripcion_${user_id}`,{status:"APRO", tkn:token})

          return res.status(200).send("OK")
        }else{
          io.emit(`pago_suscripcion_${user_id}`,{status:"ERR"})
          return res.status(200).send("OK")
        }
      }else{
        io.emit(`pago_suscripcion_${user_id}`,{status:"REJ"})
        return res.status(200).send("OK")
      }
    }catch(err){
      io.emit(`pago_suscripcion_${user_id}`,{status:"ERR"})
      return res.status(400)
    }
  }

  return res.status(200).send("OK")
})


async function register_data (user_data, suscription_data, pay_data) {
  try{
    const user = await prisma.users.create({
      data: user_data
    })
    const suscription = await prisma.suscriptions.create({
      data: suscription_data
    })
    const pay = await prisma.pays.create({
      data:pay_data
    })
    
    const response = {
      ok:true,
      user,
      suscription,
      pay
    }


    return response

  }catch(err){

    const response = {
      ok:false,
      message: err
    }
    return response
  
  }
}

router.post('/login',async(req,res)=>{
  const { email,password } = req.body;

  try{
    const user = await prisma.users.findFirst({
      where: {
        email: email
      },
    });
    console.log(user)

    const userok = bcrypt.compareSync(password, user.password)

    console.log(userok)
    
    if(userok){

      const data_plan = await prisma.$queryRaw`
        SELECT suscriptions.plan_type, suscriptions.start_date,suscriptions.status ,suscriptions.mercadopago_plan_id, plans.monthly_price, plans.annual_price, plans.nombre 
        FROM plans 
        JOIN suscriptions ON plans.id = suscriptions.plan_id 
        JOIN users ON suscriptions.user_id = users.id 
        WHERE users.email = ${email}
      `;
      
      const pagos = await prisma.$queryRaw`
        SELECT pays.transaction_amount, pays.status, pays.date 
        FROM pays 
        JOIN suscriptions ON pays.suscription_id = suscriptions.id 
        JOIN users ON suscriptions.user_id = users.id 
        WHERE users.email = ${email}
      `;

      const response = {
        user: {...user, pass:password},
        plan: data_plan,
        pagos
      }

      console.log('respuesta')
      console.log(response)
      const token = jwt.sign(response, "SECRET_KEY")

      return res.status(201).json(
        {tkn:token}
      )
    }else{
      return res.status(400).json({message:"usuario no encontrado"})
    }
  }catch(err){
    return res.status(400).json({message:err})
  }
})



router.put('/update-user',async(req,res)=>{
  const { id,data,email,pass } = req.body;  
  try{

    const updateUser = await prisma.users.update({
      where: { id },
      data: data
    })


    const data_plan = await prisma.$queryRaw`
        SELECT suscriptions.plan_type, suscriptions.start_date,suscriptions.status ,suscriptions.mercadopago_plan_id, plans.monthly_price, plans.annual_price, plans.nombre 
        FROM plans 
        JOIN suscriptions ON plans.id = suscriptions.plan_id 
        JOIN users ON suscriptions.user_id = users.id 
        WHERE users.email = ${email}
      `;
      
    const pagos = await prisma.$queryRaw`
        SELECT pays.transaction_amount, pays.status, pays.date 
        FROM pays 
        JOIN suscriptions ON pays.suscription_id = suscriptions.id 
        JOIN users ON suscriptions.user_id = users.id 
        WHERE users.email = ${email}
      `;

    const response = {
        user: { ...updateUser, pass:pass },
        plan: data_plan,
        pagos
    }

    console.log('respuesta')
    console.log(response)
    const token = jwt.sign(response, "SECRET_KEY")

    return res.status(201).json(
        {tkn:token}
    )

  }catch(err){
    return res.status(400).json({ok:false,message:err})
  }  
})

router.get('/user-exist/:email',async(req,res)=>{
  
  const email = req.params.email;
  let response;

  try{

    const user =await prisma.users.findFirst({
      where: {
        email: email
      },
    });
    console.log(user)
    if(user){
      response = {ok:true}
    }else{
      response = {ok:false}
    }
    return res.status(200).json(response)
  }catch(err){
    return res.status(400).json({ok:false})
  }
})




const codigos = [
  'ABCD', 'EFGH', 'IJKL', 'MNOP', 'QRST',
  'UVWX', 'YZ01', '2345', '6789', 'BCDE',
  'FGHI', 'JKLM', 'NOPQ', 'RSTU', 'VWXY'
];


router.post('/send-code',async(req,res)=>{

  const { email } = req.body
  const indiceAleatorio = Math.floor(Math.random() * codigos.length);
  const codigoSeleccionado = codigos[indiceAleatorio];

  try{
    const sendEmail = await sendEmailCode(email,codigoSeleccionado)
    if(sendEmail){
      return res.status(200).json({ok:true})
    }else{
      return res.status(400).json({ok:false,message:err})
    }
  }catch(err){
    return res.status(400).json({ok:false,message:err})
  }
})


router.post('/confirm-code',async(req,res)=>{

  const { cod } = req.body;
  
  let response = {ok:false};

  for (let i = 0; i < codigos.length; i++){
    if (cod === codigos[i]) {
      response = {ok:true}
    }
  }

  console.log(response)
  return res.status(201).json(response)  
})

router.post('/set-pass',async(req,res)=>{

  const {email,new_password} = req.body;

  try{

    const user = await prisma.users.findFirst({
      where:{
        email: email
      }
    })

    const id = user.id;
    
    const passHashed = bcrypt.hashSync(new_password,bcrypt.genSaltSync(10));
    
    const data = { password: passHashed}

    const updateUser = await prisma.users.update({
      where: { id : id },
      data: data
    })

    const data_plan = await prisma.$queryRaw`
        SELECT suscriptions.plan_type, suscriptions.start_date,suscriptions.status ,suscriptions.mercadopago_plan_id, plans.monthly_price, plans.annual_price, plans.nombre 
        FROM plans 
        JOIN suscriptions ON plans.id = suscriptions.plan_id 
        JOIN users ON suscriptions.user_id = users.id 
        WHERE users.email = ${email}
      `;
      
    const pagos = await prisma.$queryRaw`
        SELECT pays.transaction_amount, pays.status, pays.date 
        FROM pays 
        JOIN suscriptions ON pays.suscription_id = suscriptions.id 
        JOIN users ON suscriptions.user_id = users.id 
        WHERE users.email = ${email}
      `;

    const response = {
        user: { ...updateUser, pass: new_password },
        plan: data_plan,
        pagos
    }

    console.log('respuesta')
    console.log(response)
    const token = jwt.sign(response, "SECRET_KEY")

    return res.status(201).json(
      {tkn:token}
    )
  }catch(err){
    return res.status(400).json({ok:false,message:err})
  }
})

  
export default router