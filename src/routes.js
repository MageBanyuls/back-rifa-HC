import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { Router } from "express";
import { v4 as uuidv4 } from 'uuid';
import { io } from "../index.js";
import jwt from 'jsonwebtoken';
import 'dotenv/config.js'


const prisma = new PrismaClient();

const router = Router();

router.post('/create-suscription',async(req,res)=>{
    const { token, nombre, email, celular, rut, password,user_id } = req.body;
  
    const fecha_de_nacimiento = "1999-06-14T11:21:59.000-04:00";
    const plan = process.env.PLAN_ID;
  
    console.log(token)
    //type: monthly
    const data = {
      preapproval_plan_id: plan,
      payer_email: "test_user_422112672@testuser.com",
      card_token_id: token,
      status: "authorized", 
    }

    if(token) {
      const suscripcion = await generar_suscripcion(data); 
      if(suscripcion){
        if(suscripcion.data.status === "authorized"){
  
          //const user_id = uuidv4()
          const suscription_id = uuidv4();
          
          const pay_id = uuidv4();
  
          const user_data = { 
            id: user_id , 
            nombre, 
            email, 
            celular, 
            rut, 
            fecha_de_nacimiento, 
            activo:true, 
            password
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

            console.log('se pudo hacer el registro! :)')
            
            const dataTKN = {
              user: user_data,
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

            io.emit(`pago_suscripcion_${user_id}`,{status:"APRO", tkn:token})
  
          }else{
            console.log('no se pudo hacer el registro en planetscale')
            console.log('error:')
            io.emit(`pago_suscripcion_${user_id}`,{status:"REJ"})
            console.log(response.message)
          }
        }else{
          io.emit(`pago_suscripcion_${user_id}`,{status:"REJ"})
          console.log('no se pudo hacer')
        }
      }else{
        io.emit(`pago_suscripcion_${user_id}`,{status:"REJ"})
        console.log('no se pudo hacer')
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
            Authorization: process.env.MERCADO_PAGO_ACCES_TOKEN,
          },
        }
      )
      console.log(response)
      return response
    }catch(err){
      console.log(err)
      return null
    }
}

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

router.post('/crear-order', async(req,res)=>{
  try{

  }catch(err){

  }
})


router.post('/login',async(req,res)=>{
  const { email,password } = req.body;

  try{
    const user = await prisma.users.findFirst({
      where: {
        email: email,
        password: password
      },
    });
    
    if(user){

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
        user,
        plan: data_plan,
        pagos
      }

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


/*
SELECT suscriptions.plan_type, suscriptions.start_date, plans.monthly_price, plans.annual_price, plans.nombre 
FROM plans 
JOIN suscriptions ON plans.id = suscriptions.plan_id 
JOIN users ON suscriptions.user_id = users.id 
WHERE users.email = "";



SELECT pays.transaction_amount, pays.status, pays.date 
FROM pays 
JOIN suscriptions ON pays.suscription_id = suscriptions.id 
JOIN users ON suscriptions.user_id = users.id 
WHERE users.email = "";
*/
  
export default router