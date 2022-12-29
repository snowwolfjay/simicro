import jwt from "jsonwebtoken";
import { ProjectCollection } from "./model";
import { RequestAuthData } from "./rest/types";
export interface IUser {
  id: string;
  name: string;
  avatar: string;
}

export const getUserInfoByToken = async (
  token: string
): Promise<RequestAuthData | null> => {
  try {
    const data = jwt.decode(token) as any;
    let p = data;
    if (typeof p === "string") {
      p = JSON.parse(data);
    }
    console.log(p);
    const project = p?.project;
    if (!project) {
      return null;
    }
    const proj = await ProjectCollection.findOneAsync({ id: project });
    console.log(proj);
    if (!proj || !data?.user) {
      throw new Meteor.Error(404);
    }
    const secret = proj.secret + data.user.id;
    const verified = jwt.verify(token, secret) as any;
    return verified;
  } catch (error) {
    console.error(error);
    return null;
  }
};
