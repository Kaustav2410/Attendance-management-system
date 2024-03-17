const Sclass = require('../models/sclassSchema.js');
const Student = require('../models/studentSchema.js');
const Subject = require('../models/subjectSchema.js');
const Teacher = require('../models/teacherSchema.js');
const mailSender=require('../utils/mailSender.js')

exports.sclassCreate = async (req, res) => {
    try {
        const sclass = new Sclass({
            sclassName: req.body.sclassName,
            school: req.body.adminID
        });

        const existingSclassByName = await Sclass.findOne({
            sclassName: req.body.sclassName,
            school: req.body.adminID
        });

        if (existingSclassByName) {
            res.send({ message: 'Sorry this class name already exists' });
        }
        else {
            const result = await sclass.save();
            res.send(result);
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

exports.sclassList = async (req, res) => {
    try {
        let sclasses = await Sclass.find({ school: req.params.id })
        if (sclasses.length > 0) {
            res.send(sclasses)
        } else {
            res.send({ message: "No sclasses found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

exports.getSclassDetail = async (req, res) => {
    try {
        let sclass = await Sclass.findById(req.params.id);
        if (sclass) {
            sclass = await sclass.populate("school", "schoolName")
            res.send(sclass);
        }
        else {
            res.send({ message: "No class found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

exports.getSclassStudents = async (req, res) => {
    try {
        let students = await Student.find({ sclassName: req.params.id })
        if (students.length > 0) {
            let modifiedStudents = students.map((student) => {
                return { ...student._doc, password: undefined };
            });
            res.send(modifiedStudents);
        } else {
            res.send({ message: "No students found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}
exports.getClassReport=async (req,res)=>{
    try{
        const {id}=req.params.id;
        // console.log(req.params.id);
        console.log("report function");
        // const data = await Student.find({sClassName:req.params.id});
        let students = await Student.find({ sclassName: req.params.id })
        // console.log(students);
        if(students){
            const studentAttendance = students.map(student => {
                const totalAttendanceTillNow = student.attendance.reduce((total, entry) => 
                    entry.status === "Present" ? total + 1 : total, 0);
            
                return {
                    classId:student.sclassName ,
                    studentId: student._id,
                    studentName: student.name,
                    totalAttendance: student.attendance.length,
                    totalAttendanceTillNow,
                    percentageOfTotalAttendance: ((totalAttendanceTillNow / student.attendance.length) * 100)
                };
            });
            res.status(200).json({
                success:true, 
                studentAttendance, 
                // students
            })
        }
        else{
            res.send({message:"No students found"});
        }
    }
    catch(err){
        res.status(501).json({
            success:false,
            message:err.message
        })
    }
}

exports.sendmessage=async (req,res)=>{
    try {
        const {id}=req.params.id;
        console.log(id);
        const data = await Student.find({sClassName:id});
        if(data){
            const studentAttendance = data.map(student => {
                const totalAttendanceTillNow = student.attendance.reduce((total, entry) => 
                    entry.status === "Present" ? total + 1 : total, 0);
            
                return {
                    studentId: student._id,
                    studentName: student.name,
                    studentEmail:student.email,
                    totalAttendance: student.attendance.length,
                    totalAttendanceTillNow,
                    percentageOfTotalAttendance: ((totalAttendanceTillNow / student.attendance.length) * 100)
                };
            });
            
            studentAttendance.map((student)=>{
                let msg="\nYour attendance till now is "+student.percentageOfTotalAttendance
                if (student.percentageOfTotalAttendance < 75 ) {

                    const mailOptions = {
                        from: process.env.MAIL_USER, // Replace with your email
                        to: student.email,
                        subject: 'Low Attendance Alert',
                        text: `Dear student, your attendance is below 75%. Please improve it. ${msg}`,
                    };
                    try{
                        mailSender.mailSender(student.studentEmail,"Low Attendance",`Dear student, your attendance is below 75%. Please improve it. ${msg}`);
                    }
                    catch(err){
                        console.log(err);
                        return res.status(500).json({
                            success:false,
                            message:"Error while sending mail"
                        })
                   } 
                }
            })
            res.status(200).json({
                success: true,
                message: 'Email sent successfully',
                studentAttendance
            });

        }
        else {
            res.status(404).json({
                success: false,
                message: 'No students found',
            });   
        }     
            
     }
     catch (err) {
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
}

exports.deleteSclass = async (req, res) => {
    try {
        const deletedClass = await Sclass.findByIdAndDelete(req.params.id);
        if (!deletedClass) {
            return res.send({ message: "Class not found" });
        }
        const deletedStudents = await Student.deleteMany({ sclassName: req.params.id });
        const deletedSubjects = await Subject.deleteMany({ sclassName: req.params.id });
        const deletedTeachers = await Teacher.deleteMany({ teachSclass: req.params.id });
        res.send(deletedClass);
    } catch (error) {
        res.status(500).json(error);
    }
}

exports.deleteSclasses = async (req, res) => {
    try {
        const deletedClasses = await Sclass.deleteMany({ school: req.params.id });
        if (deletedClasses.deletedCount === 0) {
            return res.send({ message: "No classes found to delete" });
        }
        const deletedStudents = await Student.deleteMany({ school: req.params.id });
        const deletedSubjects = await Subject.deleteMany({ school: req.params.id });
        const deletedTeachers = await Teacher.deleteMany({ school: req.params.id });
        res.send(deletedClasses);
    } catch (error) {
        res.status(500).json(error);
    }
}


