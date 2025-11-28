import { useEffect } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { authService } from "@/services/auth.service";

export default function VerifyEmail() {
    const [params] = useSearchParams();
    const token = params.get("token");

    useEffect(() => {
        if (token) {
            //   axios.get(`http://localhost:3000/auth/verify-email?token=${token}`);
            authService.verifyEmail(token);
        }
    }, [token]);

    return <h3>Email đang được xác thực...</h3>;
}
