package vn.medcheck;

import java.util.*;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
  private final AuthService auth; private final String googleClientId;
  public AuthController(AuthService auth,@Value("${app.google-client-id:}") String googleClientId){this.auth=auth;this.googleClientId=googleClientId;}
  public record Credentials(String username,String password,String fullName){}
  public record GoogleCredential(String credential){}
  @PostMapping("/register") Object register(@RequestBody Credentials c){ return auth.register(c.username(),c.password(),c.fullName(),"BENH_NHAN"); }
  @PostMapping("/login") Object login(@RequestBody Credentials c){ return auth.login(c.username(),c.password()); }
  @PostMapping("/logout") Object logout(@RequestHeader(value="Authorization",required=false) String h){auth.logout(h);return Map.of("message","Đã đăng xuất");}
  @GetMapping("/me") Object me(@RequestHeader("Authorization") String h){return auth.authenticate(h);}
  @PostMapping("/google") Object google(){return Map.of("enabled",!googleClientId.isBlank(),"clientId",googleClientId);}
  @PostMapping("/google/callback") Object googleCallback(@RequestBody GoogleCredential body) throws Exception {
    if(googleClientId.isBlank())throw new IllegalArgumentException("Đăng nhập Google chưa được cấu hình trên máy chủ");
    var verifier=new GoogleIdTokenVerifier.Builder(GoogleNetHttpTransport.newTrustedTransport(),GsonFactory.getDefaultInstance()).setAudience(List.of(googleClientId)).build();
    var token=verifier.verify(body.credential());
    if(token==null)throw new SecurityException("Google credential không hợp lệ hoặc đã hết hạn");
    var p=token.getPayload();
    return auth.googleLogin(p.getSubject(),p.getEmail(),String.valueOf(p.get("name")),String.valueOf(p.get("picture")));
  }
}
