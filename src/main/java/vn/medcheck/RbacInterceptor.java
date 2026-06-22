package vn.medcheck;

import jakarta.servlet.http.*;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.*;
import org.springframework.web.servlet.config.annotation.*;

@Component
public class RbacInterceptor implements HandlerInterceptor, WebMvcConfigurer {
  private final AuthService auth;
  public RbacInterceptor(AuthService auth){this.auth=auth;}
  @Override public void addInterceptors(InterceptorRegistry r){r.addInterceptor(this).addPathPatterns("/api/**").excludePathPatterns("/api/auth/**");}
  @Override public boolean preHandle(HttpServletRequest req,HttpServletResponse res,Object handler){
    String p=req.getRequestURI(),m=req.getMethod(); Set<String> allowed=null;
    if(p.startsWith("/api/admin/"))allowed=Set.of("ADMIN");
    else if(p.startsWith("/api/patient/")||p.startsWith("/api/lookup/")||p.equals("/api/ai/generate")||p.equals("/api/ai/approved"))allowed=Set.of("BENH_NHAN");
    else if(p.startsWith("/api/ai/pending")||p.startsWith("/api/ai/approve")||p.startsWith("/api/ai/reject")||p.startsWith("/api/ai/suggestions")||p.startsWith("/api/warning-rules"))allowed=Set.of("DUOC_SI","BAC_SI");
    else if(!"GET".equals(m)&&(p.startsWith("/api/drugs")||p.startsWith("/api/ingredients")||p.startsWith("/api/diseases")||p.startsWith("/api/allergies")))allowed=Set.of("DUOC_SI","BAC_SI");
    if(allowed!=null){var u=auth.authenticate(req.getHeader("Authorization"));if(!allowed.contains(u.role()))throw new ForbiddenException("Bạn không có quyền thực hiện thao tác này");req.setAttribute("currentUser",u);}
    return true;
  }
}
