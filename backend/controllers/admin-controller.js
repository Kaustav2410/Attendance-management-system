const bcrypt = require('bcrypt');
const Admin = require('../models/adminSchema.js');
const Sclass = require('../models/sclassSchema.js');
const Student = require('../models/studentSchema.js');
const Teacher = require('../models/teacherSchema.js');
const Subject = require('../models/subjectSchema.js');
const Notice = require('../models/noticeSchema.js');
const Complain = require('../models/complainSchema.js');
const jwt=require('jsonwebtoken');

exports.adminRegister = async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(req.body.password, salt);

        const admin = new Admin({
            ...req.body,
            password: hashedPass
        });

        const existingAdminByEmail = await Admin.findOne({ email: req.body.email });
        const existingSchool = await Admin.findOne({ schoolName: req.body.schoolName });

        if (existingAdminByEmail) {
            res.send({ message: 'Email already exists' });
        }
        else if (existingSchool) {
            res.send({ message: 'College name already exists' });
        }
        else {
            let result = await admin.save();
            result.password = undefined;
            res.send(result);
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

exports.adminLogIn = async (req, res) => {
     try{ 
        const {email,password,}=req.body;
        if (email && password) {
            let user = await Admin.findOne({ 
                email:email 
            });
            if (user) {
                const validated = await bcrypt.compare(password, user.password);
                if (validated) {
                   const payload={
                    email:user.email,
                    id:user._id,
                    role:user.role,
                   }
                   let token =jwt.sign(payload,process.env.JWT_SECRET,{expiresIn:"6h"});
                   user=user.toObject();
                   user.token=token;
                   user.password=undefined;
    
                   const options={
                        expires: new Date(Date.now()+300000),
                        httpOnly:true
                   }
                
                   res.cookie("token",token,options).status(200).json({
                        success:true,
                        token,
                        user,
                        message:"Admin logged in succesfully"
                   })
                   res.send()
                } 
                else{
                    return res.status(403).json({
                        success:false,
                        message:"Wrong password entered"
                    })
                }
            } else {
                return res.status(401).json({
                    success:false,
                    message:`Admin with the given details doesn't exists`
                })
            }
        }
     }
     catch(err){
        console.error(err);
        res.status(500).json(
            {
               status:false,
                message:"Internal server error",
                error:err.message,
            }
        )
     }
};

exports.getAdminDetail = async (req, res) => {
    try {
        let admin = await Admin.findById(req.params.id);
        if (admin) {
            admin.password = undefined;
            return res.status(200).json(
                {
                   status:true,
                    admin,
                }
            )
        }
        else {
            res.status(500).json(
                {
                   status:false,
                    message:"No admin found",
                    error:err.message,
                }
            )
        }
    }
    catch(err){
        console.error(err);
        res.status(500).json(
            {
               status:false,
                message:"Internal server error",
                error:err.message,
            }
        )
    }
}

exports.deleteAdmin = async (req, res) => {
    try {
        const result = await Admin.findByIdAndDelete(req.params.id)

        await Sclass.deleteMany({ school: req.params.id });
        await Student.deleteMany({ school: req.params.id });
        await Teacher.deleteMany({ school: req.params.id });
        await Subject.deleteMany({ school: req.params.id });
        await Notice.deleteMany({ school: req.params.id });
        await Complain.deleteMany({ school: req.params.id });

        res.send(result)
    } catch (error) {
        res.status(500).json(err);
    }
}

exports.updateAdmin = async (req, res) => {
    try {
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10)
            res.body.password = await bcrypt.hash(res.body.password, salt)
        }
        let result = await Admin.findByIdAndUpdate(req.params.id,
            { $set: req.body },
            { new: true })

        result.password = undefined;
        res.send(result)
    } catch (error) {
        res.status(500).json(err);
    }
}

// module.exports = { adminRegister, adminLogIn, getAdminDetail, deleteAdmin, updateAdmin };

