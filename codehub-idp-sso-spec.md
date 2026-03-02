codehub-idp-sso-spec.md
## 문서 목적
- 사내 sso 인증에 대한 현 프로젝트의 스펙 문서.
- 실제 보안 관점에서 허점이 많은 부분이 있지만 사내용이기 때문에 허점은 무시함

## 프로토콜
- OIDC
- response_type = id_token(우선 id_token만 확인)

## 흐름
- FE -> BE (/sso)
- BE -> Idp redirect
- 사용자 로그인
- idp -> BE (/acs)
- BE가 .cer 공개키로 id_token decode
- decode한 값중 userid값을 취득하고 해당 값을 epid라는 필드로 저장
- 아래 값을 payload로 token을 secret_key + HS256으로 encode하여 토큰 저장 "sub":"Access-Token", "epid":저장한값, “iat”: int(now.timestamp()), "exp": now + 12시간
- 해당 토큰을 query param으로 하여 FE 도메인 + /auth 로 redirect 함


## 예시 코드

₩₩₩
	if 'sso' in req['get_data']:

		idp_url = config.IDP_Config['Idp.EntityID']
		auth_param = '?client_id=' + config.IDP_Config['Idp.ClientID']
		auth_param += '&redirect_uri=' + config.SP_Config['SP.RedirectUrl']
		auth_param += '&response_mode=form_post'
		auth_param += '&response_type=code+id_token'
		auth_param += '&scope=openid+profile'
		auth_param += '&nonce=' + uuid.uuid4().urn[9:]
		return HttpResponseRedirect(idp_url + auth_param)

# acs
	adtoken = request.POST.get("id_token")
	
	cert_str = open(config.IDP_Config['CertFile_Path'] + config.IDP_Config['CertFile_Name'], 'rb').read()
	cert_obj = x509.load_pem_x509_certificate(cert_str, default_backend())
	public_key = cert_obj.public_key()
	decoded_token = jwt.decode(jwt=adtoken, key = public_key, verify=True, algorithms="RS256", options={"verify_signatur":True, "verify_exp": True, "verify_aud": False})
	new_token = # payload 	생성 후, jwt.encode(payload, SECRET_KEY, algorithm = RS256)
	# 이후 프론트로 리다이렉트 (/auth, + query_params에 new_token)

₩₩₩

