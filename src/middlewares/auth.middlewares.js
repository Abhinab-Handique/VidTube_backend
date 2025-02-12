import jwt from 'jsonwebtoken'
import { User } from '../models/users.models'
import { ApiError } from '../utils/ApiError'
import { asyncHandler } from '../utils/asyncHandler'


export const verifyJWT= asyncHandler(async(req,_,next)=>{

    const token= req.cookies.accessToken || req.body.accessToken || req.header("Authorization")?.replace("Bearer ", "Bearer ","")
if(!token){
    throw new ApiError(401,"Unauthorized")
    try{
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        const user=await User.findById(decodedToken?._id).select("-password -refreshToken")

        if(!user){
            throw new ApiError(401,"No user found")

        }

        req.user=user
        next()
    }
    catch(error){

        throw new ApiError(401,error?.message ||"Ivalid access token")
        
    }
}


})