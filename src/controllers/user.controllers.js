import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/users.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import {deleteFromCloudinary} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
   const user = await User.findById(userId)
   if(!user) throw new ApiError("No such user")

  try{
    accesstoken=user.generateAccessToken()
    refreshtoken=user.generateAccessToken()
    user.refreshToken=refreshtoken
    await user.save({validateBeforeSave: false})
    return {accesstoken,refreshtoken}

  }
  catch(error){
    throw new ApiError("Something went wrong in generating access and refresh token",error)


  }

}


const registerUser = asyncHandler( async(req,res)=>{
    const {fullname,email,username,password}=req.body

    //validation
    if(!req.body) throw new ApiError(400,"please enter the data")
    if([fullname,email,username,password].some((field)=> field?.trim()==="")){
        throw new ApiError(400,"All fields are required")
    }


    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser) {
        throw new ApiError(400,"user with email or username already exists")
    }
    console.log(req.files)

    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverLocalPath = req.files?.coverImage?.[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    // const avatar= await uploadOnCloudinary(avatarLocalPath)
    // let coverImage=""
    // if(coverLocalPath) coverImage= await uploadOnCloudinary(coverLocalPath)

    let avatar;
    try {
       avatar= await uploadOnCloudinary(avatarLocalPath)
       console.log("uploaded avatar",avatar)

    } catch (error) {
        console.log("Error uploading avatar",error)
        throw new ApiError(400,"Failed to upload avatar")
    }

    let coverImage;
    try {
       coverImage= await uploadOnCloudinary(coverLocalPath)
       console.log("uploaded coverImage",coverImage)
       
    } catch (error) {
        console.log("Error uploading avatar",error)
        throw new ApiError(400,"Failed to upload CoverImage")
    }

    try{
        const user=await User.create({
            fullname,
            avatar:avatar.url,
            coverImage:coverImage?.url || "",
            email,
            password,
            username:username.toLocaleLowerCase(),
        })
    
        const createdUser=await User.findById(user._id).select(
            "-password -refreshToken"
        )
        if(!createdUser){
            throw new ApiError(500,"something went wrong while registering user")
        }
    
        return res.status(201)
        .json(new ApiResponse(200,createdUser,"user registed successfully"))
    }
    catch(error){
        console.log("User Creation Failed")
        if(avatar){
            await deleteFromCloudinary(avatar.public_id)

        }
        if(coverImage){
            await deleteFromCloudinary(coverImage.public_id)
        }
        throw new ApiError(500,"Failed in registering in user so the imgaes are deleted")
        
    }





})

const loginUser = asyncHandler(async (req,res)=>{

    const {email,username,password} = req.body;
    if(!email) throw new ApiError(500,"Please enter the email address")
    const user=await User.findOne({
        $or:[{username},{email}]
    })
    if(!user) throw new ApiError(404,"User not found")

    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid) throw new ApiError(401,"password is not correct")
    

    const {accesstoken,refreshtoken} = await generateAccessTokenAndRefreshToken(user._id)


    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")

    if(!loggedInUser) throw new ApiError(401,"no logged in user")

    const options ={
        httpOnly: true,
        secure:process.env.NODE_ENV === 'production'
    }

    return res
        .status(200)
        .cookie("accesstoken",accesstoken,options)
        .cookie("refreshtoken",refreshtoken,options)
        .json(new ApiResponse(200,
            {user:loggedInUser,accesstoken,refreshtoken},
            "User logged in successfully"
            ))

})

const logoutUser= asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        
    )
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshtoken
    try{
      const decodedToken=  jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user=await User.findById(decodedToken?._id)
        if(!user) throw new ApiError(401,"invalid refresh token")
        if(incomingRefreshToken!== user?.refreshToken) throw new ApiError(401,"invalid refresh token")
        const options={
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        }
       const {accesstoken,refreshtoken:newrefreshtoken}=await generateAccessTokenAndRefreshToken(user._id)
       return res
       .status(200)
       .cookie("accesstoken",accesstoken,options)
       .cookie("refreshtoken",newrefreshtoken,options)
       .json(
        new ApiResponse(
            200,
            {accesstoken,
                refreshtoken:newrefreshtoken},
                "Access token refreshed successfully"
        )
       )
    }catch(error){
        throw new ApiError("something went wrong in refreshing the token",error)

    }
})


export {registerUser,loginUser}