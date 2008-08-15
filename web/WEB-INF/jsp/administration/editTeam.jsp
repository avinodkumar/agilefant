<%@ include file="../inc/_taglibs.jsp"%>
<%@ include file="../inc/_header.jsp"%>


<aef:menu navi="administration" subnavi="teams" pageHierarchy="${pageHierarchy}" />

<ww:actionerror />
<ww:actionmessage />

<aef:userList />

<h2>Edit team</h2>

<ww:form action="storeTeam" method="post">

<ww:hidden name="teamId" value="${teamId}" />

	<table class="formTable">
		<tr>
			<td>Name</td>
			<td>*</td>
			<td colspan="2"><ww:textfield size="60" name="team.name" /></td>
		</tr>
		<tr>
			<td>Description</td>
			<td></td>
			<td colspan="2"><ww:textarea cols="70" rows="10" name="team.description" cssClass="useWysiwyg" /></td>
		</tr>
		<tr>
			<td><a href="javascript:toggleDiv('teamlist');">Select users</a></td>
			<td></td>
			<td>
			<span><c:out value="${team.numberOfUsers}" /> users in team</span>
			<ul id="teamlist" style="display:none;list-style-type:none;">
			
			<c:forEach items="${userList}" var="user" varStatus="status">
				<c:choose>
					<c:when test="${aef:listContains(team.users, user)}">
						<c:set var="selected" value="true" />
					</c:when>
					<c:otherwise>
						<c:set var="selected" value="" />
					</c:otherwise>
				</c:choose>
				<li class="${(status.index % 2 == 0) ? 'even' : 'odd'}"><ww:checkbox name="userIds[${user.id}]" value="${selected}"/>
				<c:out value="${user.fullName}" /></li>
			</c:forEach>
			</ul>
			</td>
		</tr>
		<tr>
			<td></td>
			<td></td>
			<c:choose>
				<c:when test="${team.id == 0}">
					<td><ww:submit value="Create" /></td>
				</c:when>
				<c:otherwise>
					<td><ww:submit value="Save" /></td>
					<td class="deleteButton"> <ww:submit action="deleteTeam"
							onclick="return confirmDeleteTeam()" value="Delete" /> </td>
				</c:otherwise>
			</c:choose>
		</tr>
	</table>
</ww:form>

<%@ include file="../inc/_footer.jsp"%>