const bcrypt = require('bcrypt');
const Student = require('../models/studentSchema.js');
const Subject = require('../models/subjectSchema.js');
const jwt=require('jsonwebtoken');
exports.studentRegister = async (req, res) => {
    try {
        // const {rollNum,school,sclassName}=req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(req.body.password, salt);

        const existingStudent = await Student.findOne({
            rollNum: req.body.rollNum,
            school: req.body.adminID,
            sclassName: req.body.sclassName,
        });

        if (existingStudent) {
            res.send({ message: 'Roll Number already exists' });
        }
        else {
            const student = new Student({
                ...req.body,
                school: req.body.adminID,
                password: hashedPass
            });

            let result = await student.save();

            result.password = undefined;
            res.send(result);
        }
    } catch (err) {
        return res.status(500).json({
            success:false,
            message:"Unable to register student"
        })
    }
};

exports.BulkStudentRegister = async (req, res) => {
    try {
        // const {rollNum,school,sclassName}=req.body;
       const {bulkInput,adminID,sclassName,role,attendance} =req.body;
        console.log(bulkInput,adminID);
        // db.students.insertMany([{"name": "L1","rollNum": 10,"email": "L1@gmail.com","password": "$2b$10$X.wfCeQVnjffBirrnEW1zOvEK4SjH875tzPibC5wZhOlw0GNUqAIW","sclassName": {"$oid": "656f35ee20a6c21eef701e98"},"school": {"$oid": "656f2de58820b3d6e138aaa3"},"role": "Student","attendance": [],"examResult": []},{"name": "L2","rollNum": 11,"email": "L2@gmail.com","password": "$2b$10$X.wfCeQVnjffBirrnEW1zOvEK4SjH875tzPibC5wZhOlw0GNUqAIW","sclassName": {"$oid": "656f35ee20a6c21eef701e98"},"school": {"$oid": "656f2de58820b3d6e138aaa3"},"role": "Student","attendance": [],"examResult": []}])

        // [{"name": "L1","rollNum": 10,"email": "L1@gmail.com"},{"name": "L2","rollNum": 11,"email": "L2@gmail.com"}]
    //    const bulkStudents = await Student.insertMany(bulkInput);
    const BulkedInput = JSON.parse(bulkInput);
    console.log(BulkedInput.length);
    for (const key of BulkedInput) {
            const newstudent = await Student.create({name:key.name,rollNum:key.rollNum,email:key.email,password:"$2b$10$X.wfCeQVnjffBirrnEW1zOvEK4SjH875tzPibC5wZhOlw0GNUqAIW",sclassName:sclassName,school:adminID,role:role,attendance:attendance})
            console.log(newstudent);
    }
       return res.status(200).json({
        success:true,
        school:req.body.adminID,
        // bulkStudents,
        message:"Bulk data received successfully"
       })
    } catch (err) {
        console.error(err)
        return res.status(500).json({
            success:false,
            message:"Unable to bulk register student",
        })
    }
};

exports.studentLogIn = async (req, res) => {
    try {
        const {rollNum,studentName,password}=req.body;
        console.log(rollNum,studentName,password);
        let user = await Student.findOne({ rollNum:rollNum, name:studentName });
        if (user) {
            const validated = await bcrypt.compare(password, user.password);
            if (validated) {
                classes=await user.populate("sclassName")
                college = await user.populate("school")
                // console.log(classes,college);
                const payload={
                    id:user._id,
                    role:user.role,
                    className:classes,
                    College:college,
                }
                let token=jwt.sign(payload,process.env.JWT_SECRET,{expiresIn:"30s"})

                user=user.toObject();
                user.token=token;
                user.password=undefined;

                const options={
                    expires: new Date(Date.now()+300000),
                    httpOnly:true
               }

               res.cookie("token",token,options)
                res.send(
                    {user,
                    message:"Student log in succesfully"}
               );
            } else{
                return res.status(403).json({
                    success:false,
                    message:"Wrong password entered"
                })
            }
        } else {
            return res.status(401).json({
                success:false,
                message:`Student with the given details doesn't exists`
            })
        }
    } 
    catch (err) {
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

exports.getStudents = async (req, res) => {
    try {
        let students = await Student.find({ school: req.params.id }).populate("sclassName", "sclassName");
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
};

exports.getStudentDetail = async (req, res) => {
    try {
        let student = await Student.findById(req.params.id)
            .populate("school", "schoolName")
            .populate("sclassName", "sclassName")
            .populate("examResult.subName", "subName")
            .populate("attendance.subName", "subName sessions");
        if (student) {
            student.password = undefined;
            res.send(student);
        }
        else {
            res.send({ message: "No student found" });
        }
    } catch (err) {
        res.status(500).json(err);
    }
}

exports.deleteStudent = async (req, res) => {
    try {
        const result = await Student.findByIdAndDelete(req.params.id)
        res.send(result)
    } catch (error) {
        res.status(500).json(err);
    }
}

exports.deleteStudents = async (req, res) => {
    try {
        const result = await Student.deleteMany({ school: req.params.id })
        if (result.deletedCount === 0) {
            res.send({ message: "No students found to delete" })
        } else {
            res.send(result)
        }
    } catch (error) {
        res.status(500).json(err);
    }
}

exports.deleteStudentsByClass = async (req, res) => {
    try {
        const result = await Student.deleteMany({ sclassName: req.params.id })
        if (result.deletedCount === 0) {
            res.send({ message: "No students found to delete" })
        } else {
            res.send(result)
        }
    } catch (error) {
        res.status(500).json(err);
    }
}

exports.updateStudent = async (req, res) => {
    try {
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10)
            res.body.password = await bcrypt.hash(res.body.password, salt)
        }
        let result = await Student.findByIdAndUpdate(req.params.id,
            { $set: req.body },
            { new: true })

        result.password = undefined;
        res.send(result)
    } catch (error) {
        res.status(500).json(error);
    }
}

exports.updateExamResult = async (req, res) => {
    const { subName, marksObtained } = req.body;

    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.send({ message: 'Student not found' });
        }

        const existingResult = student.examResult.find(
            (result) => result.subName.toString() === subName
        );

        if (existingResult) {
            existingResult.marksObtained = marksObtained;
        } else {
            student.examResult.push({ subName, marksObtained });
        }

        const result = await student.save();
        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.studentAttendance = async (req, res) => {
    const { subName, status,session,date } = req.body;
    // console.log(subName,status,session,date);

    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.send({ message: 'Student not found' });
        }

        const subject = await Subject.findById(subName);
        let updatedSession= subject.sessions;
        // console.log(updatedSession);
        // let nsession=parseInt((updatedSession));
        // let isession=parseInt((session));
        // nsession+=isession;
        // let newsession=nsession.toString();
        // console.log(newsession);
        const existingAttendance = student.attendance.find(
            (a) =>
                a.date.toDateString() === new Date(date).toDateString() &&
                a.subName.toString() === subName
        );

        if (existingAttendance) {
            existingAttendance.status = status;
        } else {
            // Check if the student has already attended the maximum number of sessions
            const attendedSessions = student.attendance.filter(
                (a) => a.subName.toString() === subName
            ).length;

            if (attendedSessions >= subject.sessions) {
                return res.send({ message: 'Maximum attendance limit reached' });
            }
            // await Subject.findByIdAndUpdate(subName,{session:newsession})
            student.attendance.push({ date, status, subName });
        }

        const result = await student.save();
        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.clearAllStudentsAttendanceBySubject = async (req, res) => {
    const subName = req.params.id;

    try {
        const result = await Student.updateMany(
            { 'attendance.subName': subName },
            { $pull: { attendance: { subName } } }
        );
        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.clearAllStudentsAttendance = async (req, res) => {
    const schoolId = req.params.id

    try {
        const result = await Student.updateMany(
            { school: schoolId },
            { $set: { attendance: [] } }
        );

        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

exports.removeStudentAttendanceBySubject = async (req, res) => {
    const studentId = req.params.id;
    const subName = req.body.subId

    try {
        const result = await Student.updateOne(
            { _id: studentId },
            { $pull: { attendance: { subName: subName } } }
        );

        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};


exports.removeStudentAttendance = async (req, res) => {
    const studentId = req.params.id;

    try {
        const result = await Student.updateOne(
            { _id: studentId },
            { $set: { attendance: [] } }
        );

        return res.send(result);
    } catch (error) {
        res.status(500).json(error);
    }
};


// module.exports = {
//     studentRegister,
//     studentLogIn,
//     getStudents,
//     getStudentDetail,
//     deleteStudents,
//     deleteStudent,
//     updateStudent,
//     studentAttendance,
//     deleteStudentsByClass,
//     updateExamResult,

//     clearAllStudentsAttendanceBySubject,
//     clearAllStudentsAttendance,
//     removeStudentAttendanceBySubject,
//     removeStudentAttendance,
// };